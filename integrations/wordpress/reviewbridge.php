<?php
/**
 * Plugin Name: ReviewBridge Embed
 * Description: Display a ReviewBridge review widget with [reviewbridge token="..."] in a page or post.
 * Version: 1.0.0
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 */

if (!defined('ABSPATH')) {
    exit;
}

function reviewbridge_render_shortcode($attributes) {
    $attributes = shortcode_atts(array('token' => ''), $attributes, 'reviewbridge');
    $token = strtolower(trim((string) $attributes['token']));
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
        return '';
    }

    $src = 'https://review-bridge.vercel.app/api/widget/' . $token;
    return '<div class="reviewbridge-widget"><script src="' . esc_url($src) . '"></script></div>';
}

add_shortcode('reviewbridge', 'reviewbridge_render_shortcode');
