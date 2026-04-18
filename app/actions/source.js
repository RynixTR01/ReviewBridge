"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PLAN_LIMITS } from "@/lib/plans";
import crypto from "crypto";
import { extractPlaceId } from "@/app/lib/extractPlaceId";

export async function addSourceAction(prevState, formData) {
  if (!formData) {
    // If someone calls this directly without formData, or due to a signature mismatch
    formData = prevState;
    if (!formData || !formData.get) {
       return { error: "Form data is missing." };
    }
  }

  const platform = formData.get("platform");
  const identifier = extractPlaceId(formData.get("identifier"));
  
  if (!identifier) {
    return { error: "Could not extract Place ID from the URL. Please paste a valid Google Maps URL or Place ID." };
  }

  if (!platform || !identifier) {
    return { error: "Platform and Identifier are required." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }


  // Check plan limits
  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan || "free";
  const limits = PLAN_LIMITS[plan];

  const { count, error: sourcesFetchError } = await supabase
    .from("sources")
    .select("*", { count: "exact", head: true, cache: "no-store" })
    .eq("user_id", user.id);


  if (count >= limits.maxSources) {
    return { error: `Your ${plan} plan is limited to ${limits.maxSources} source(s). Please upgrade to add more.` };
  }

  // 1. Call SerpAPI (or similar service) to verify and fetch reviews
  let businessName = "Unknown Business";
  let reviewsList = [];
  let totalScore = null;
  let totalReviewsCount = null;


  try {
    // Note: Apify actor applies to Google Maps.
    // For this example, we mock the fetch if APIFY_API_TOKEN isn't set.
    if (process.env.APIFY_API_TOKEN) {
      if (platform === "google") {
        const mapsUrl = formData.get("identifier").includes('google.com/maps') 
          ? formData.get("identifier")  
          : `https://www.google.com/maps/place/?q=place_id:${identifier}`;


        const payloadObj = {
          startUrls: [{ url: mapsUrl }],
          maxReviews: 20,
          reviewsSort: 'newest',
          language: 'tr'
        };

        const response = await fetch(
          `https://api.apify.com/v2/acts/Xb8osYTtOjlsgI6k9/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadObj)
          }
        );
        
        const rawText = await response.text();
        const data = JSON.parse(rawText);

        businessName = data.length > 0 && data[0].title ? data[0].title : "Google Business";
        totalScore = data[0]?.totalScore || null;
        totalReviewsCount = data[0]?.reviewsCount || null;
        reviewsList = data.map(item => ({
          reviewer_name: item.name,
          rating: item.stars,
          body: item.text,
          reviewed_at: item.publishedAtDate
        }));
      } else if (platform === "trustpilot") {
        businessName = "Trustpilot Business";
        reviewsList = [
          { reviewer_name: "John Doe", rating: 5, body: "Great service!", reviewed_at: new Date().toISOString() }
        ];
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        // Mock data for development when APIFY_API_TOKEN is missing
        businessName = platform === "google" ? "Google Coffee Shop" : "Trustpilot Store";
        reviewsList = [
          { reviewer_name: "Alice", rating: 5, body: "Absolutely amazing experience!", reviewed_at: new Date().toISOString() },
          { reviewer_name: "Bob", rating: 4, body: "Good, but could be better.", reviewed_at: new Date().toISOString() },
          { reviewer_name: "Charlie", rating: 5, body: "Highly recommended.", reviewed_at: new Date().toISOString() }
        ];
      } else {
        return { error: "Apify token is not configured. Add APIFY_API_TOKEN to your environment variables." };
      }
    }
  } catch (err) {
    console.error("Error fetching reviews:", err);
    // Proceed without failing. Save the source with 0 reviews so we can retry syncing later.
  }

  // 2. Insert into sources
  const { data: newSource, error: sourceError } = await supabase
    .from("sources")
    .insert({
      user_id: user.id,
      platform,
      place_id: identifier,
      business_name: businessName,
      total_score: totalScore,
      total_reviews_count: totalReviewsCount,
      last_synced_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (sourceError) {
    console.error("Insert source error:", sourceError);
    return { error: "Failed to save the source to database." };
  }

  // 3. Insert reviews
  const reviewsToInsert = reviewsList.slice(0, 20).map((r) => ({
    source_id: newSource.id,
    reviewer_name: r.reviewer_name || "Anonymous",
    rating: r.rating || 5,
    body: r.body || "",
    reviewed_at: r.reviewed_at ? new Date(r.reviewed_at) : new Date().toISOString(),
  }));

  if (reviewsToInsert.length > 0) {
    const { error: reviewsError } = await supabase.from("reviews").insert(reviewsToInsert);
    if (reviewsError) console.error("Insert reviews error:", reviewsError);
  }

  // 4. Create default widget
  const embedToken = crypto.randomUUID().replace(/-/g, "");
  const { data: newWidget, error: widgetError } = await supabase
    .from("widgets")
    .insert({
      user_id: user.id,
      source_id: newSource.id,
      theme: "light",
      max_reviews: 5,
      show_badge: true,
      embed_token: embedToken,
    })
    .select()
    .single();

  if (widgetError) {
    console.error("Widget creation error:", widgetError);
  }

  revalidatePath("/dashboard");
  
  // Redirect to the newly created widget customization page
  if (newWidget) {
    redirect(`/dashboard/widget/${newWidget.id}`);
  } else {
    redirect("/dashboard");
  }
}
