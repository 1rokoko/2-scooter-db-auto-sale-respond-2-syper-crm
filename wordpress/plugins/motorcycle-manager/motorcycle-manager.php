<?php
/**
 * Plugin Name: Motorcycle Manager
 * Plugin URI: https://github.com/1rokoko/2-scooter-db-auto-sale-respond-2-syper-crm
 * Description: AI-powered motorcycle catalog with custom post types, meta fields, and automated content generation
 * Version: 1.0.0
 * Author: Motorcycle Marketplace Team
 * License: GPL v2 or later
 * Text Domain: motorcycle-manager
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('MOTORCYCLE_MANAGER_VERSION', '1.0.0');
define('MOTORCYCLE_MANAGER_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('MOTORCYCLE_MANAGER_PLUGIN_URL', plugin_dir_url(__FILE__));

class MotorcycleManager {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
        add_action('save_post', array($this, 'save_motorcycle_meta'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        
        // AJAX actions for AI content generation
        add_action('wp_ajax_generate_motorcycle_description', array($this, 'ajax_generate_description'));
        add_action('wp_ajax_generate_motorcycle_highlights', array($this, 'ajax_generate_highlights'));
        
        // Add custom columns to admin list
        add_filter('manage_motorcycle_posts_columns', array($this, 'add_admin_columns'));
        add_action('manage_motorcycle_posts_custom_column', array($this, 'admin_column_content'), 10, 2);
        
        // Make columns sortable
        add_filter('manage_edit-motorcycle_sortable_columns', array($this, 'sortable_columns'));
    }
    
    public function init() {
        $this->register_post_type();
        $this->register_taxonomies();
    }
    
    public function register_post_type() {
        $labels = array(
            'name'                  => _x('Motorcycles', 'Post type general name', 'motorcycle-manager'),
            'singular_name'         => _x('Motorcycle', 'Post type singular name', 'motorcycle-manager'),
            'menu_name'             => _x('Motorcycles', 'Admin Menu text', 'motorcycle-manager'),
            'name_admin_bar'        => _x('Motorcycle', 'Add New on Toolbar', 'motorcycle-manager'),
            'add_new'               => __('Add New', 'motorcycle-manager'),
            'add_new_item'          => __('Add New Motorcycle', 'motorcycle-manager'),
            'new_item'              => __('New Motorcycle', 'motorcycle-manager'),
            'edit_item'             => __('Edit Motorcycle', 'motorcycle-manager'),
            'view_item'             => __('View Motorcycle', 'motorcycle-manager'),
            'all_items'             => __('All Motorcycles', 'motorcycle-manager'),
            'search_items'          => __('Search Motorcycles', 'motorcycle-manager'),
            'parent_item_colon'     => __('Parent Motorcycles:', 'motorcycle-manager'),
            'not_found'             => __('No motorcycles found.', 'motorcycle-manager'),
            'not_found_in_trash'    => __('No motorcycles found in Trash.', 'motorcycle-manager'),
            'featured_image'        => _x('Motorcycle Image', 'Overrides the "Featured Image" phrase', 'motorcycle-manager'),
            'set_featured_image'    => _x('Set motorcycle image', 'Overrides the "Set featured image" phrase', 'motorcycle-manager'),
            'remove_featured_image' => _x('Remove motorcycle image', 'Overrides the "Remove featured image" phrase', 'motorcycle-manager'),
            'use_featured_image'    => _x('Use as motorcycle image', 'Overrides the "Use as featured image" phrase', 'motorcycle-manager'),
            'archives'              => _x('Motorcycle archives', 'The post type archive label', 'motorcycle-manager'),
            'insert_into_item'      => _x('Insert into motorcycle', 'Overrides the "Insert into post" phrase', 'motorcycle-manager'),
            'uploaded_to_this_item' => _x('Uploaded to this motorcycle', 'Overrides the "Uploaded to this post" phrase', 'motorcycle-manager'),
            'filter_items_list'     => _x('Filter motorcycles list', 'Screen reader text for the filter links', 'motorcycle-manager'),
            'items_list_navigation' => _x('Motorcycles list navigation', 'Screen reader text for the pagination', 'motorcycle-manager'),
            'items_list'            => _x('Motorcycles list', 'Screen reader text for the items list', 'motorcycle-manager'),
        );
        
        $args = array(
            'labels'             => $labels,
            'public'             => true,
            'publicly_queryable' => true,
            'show_ui'            => true,
            'show_in_menu'       => true,
            'query_var'          => true,
            'rewrite'            => array('slug' => 'motorcycles'),
            'capability_type'    => 'post',
            'has_archive'        => true,
            'hierarchical'       => false,
            'menu_position'      => 20,
            'menu_icon'          => 'dashicons-car',
            'supports'           => array('title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'),
            'show_in_rest'       => true, // Enable Gutenberg editor
        );
        
        register_post_type('motorcycle', $args);
    }
    
    public function register_taxonomies() {
        // Motorcycle Brand taxonomy
        register_taxonomy('motorcycle_brand', 'motorcycle', array(
            'hierarchical'      => true,
            'labels'            => array(
                'name'              => _x('Brands', 'taxonomy general name', 'motorcycle-manager'),
                'singular_name'     => _x('Brand', 'taxonomy singular name', 'motorcycle-manager'),
                'search_items'      => __('Search Brands', 'motorcycle-manager'),
                'all_items'         => __('All Brands', 'motorcycle-manager'),
                'parent_item'       => __('Parent Brand', 'motorcycle-manager'),
                'parent_item_colon' => __('Parent Brand:', 'motorcycle-manager'),
                'edit_item'         => __('Edit Brand', 'motorcycle-manager'),
                'update_item'       => __('Update Brand', 'motorcycle-manager'),
                'add_new_item'      => __('Add New Brand', 'motorcycle-manager'),
                'new_item_name'     => __('New Brand Name', 'motorcycle-manager'),
                'menu_name'         => __('Brands', 'motorcycle-manager'),
            ),
            'show_ui'           => true,
            'show_admin_column' => true,
            'query_var'         => true,
            'rewrite'           => array('slug' => 'brand'),
            'show_in_rest'      => true,
        ));
        
        // Motorcycle Type taxonomy
        register_taxonomy('motorcycle_type', 'motorcycle', array(
            'hierarchical'      => true,
            'labels'            => array(
                'name'              => _x('Types', 'taxonomy general name', 'motorcycle-manager'),
                'singular_name'     => _x('Type', 'taxonomy singular name', 'motorcycle-manager'),
                'search_items'      => __('Search Types', 'motorcycle-manager'),
                'all_items'         => __('All Types', 'motorcycle-manager'),
                'parent_item'       => __('Parent Type', 'motorcycle-manager'),
                'parent_item_colon' => __('Parent Type:', 'motorcycle-manager'),
                'edit_item'         => __('Edit Type', 'motorcycle-manager'),
                'update_item'       => __('Update Type', 'motorcycle-manager'),
                'add_new_item'      => __('Add New Type', 'motorcycle-manager'),
                'new_item_name'     => __('New Type Name', 'motorcycle-manager'),
                'menu_name'         => __('Types', 'motorcycle-manager'),
            ),
            'show_ui'           => true,
            'show_admin_column' => true,
            'query_var'         => true,
            'rewrite'           => array('slug' => 'type'),
            'show_in_rest'      => true,
        ));
    }
    
    public function add_meta_boxes() {
        add_meta_box(
            'motorcycle_specs',
            __('Motorcycle Specifications', 'motorcycle-manager'),
            array($this, 'specs_meta_box_callback'),
            'motorcycle',
            'normal',
            'high'
        );
        
        add_meta_box(
            'motorcycle_pricing',
            __('Pricing & Availability', 'motorcycle-manager'),
            array($this, 'pricing_meta_box_callback'),
            'motorcycle',
            'side',
            'high'
        );
        
        add_meta_box(
            'motorcycle_ai_content',
            __('AI-Generated Content', 'motorcycle-manager'),
            array($this, 'ai_content_meta_box_callback'),
            'motorcycle',
            'normal',
            'default'
        );
    }
    
    public function specs_meta_box_callback($post) {
        wp_nonce_field('motorcycle_meta_box', 'motorcycle_meta_box_nonce');
        
        $engine_size = get_post_meta($post->ID, '_motorcycle_engine_size', true);
        $engine_type = get_post_meta($post->ID, '_motorcycle_engine_type', true);
        $power = get_post_meta($post->ID, '_motorcycle_power', true);
        $torque = get_post_meta($post->ID, '_motorcycle_torque', true);
        $weight = get_post_meta($post->ID, '_motorcycle_weight', true);
        $fuel_capacity = get_post_meta($post->ID, '_motorcycle_fuel_capacity', true);
        $year = get_post_meta($post->ID, '_motorcycle_year', true);
        $mileage = get_post_meta($post->ID, '_motorcycle_mileage', true);
        $color = get_post_meta($post->ID, '_motorcycle_color', true);
        
        echo '<table class="form-table">';
        echo '<tr><th><label for="motorcycle_year">' . __('Year', 'motorcycle-manager') . '</label></th>';
        echo '<td><input type="number" id="motorcycle_year" name="motorcycle_year" value="' . esc_attr($year) . '" min="1900" max="' . (date('Y') + 1) . '" /></td></tr>';
        
        echo '<tr><th><label for="motorcycle_engine_size">' . __('Engine Size (cc)', 'motorcycle-manager') . '</label></th>';
        echo '<td><input type="number" id="motorcycle_engine_size" name="motorcycle_engine_size" value="' . esc_attr($engine_size) . '" /></td></tr>';
        
        echo '<tr><th><label for="motorcycle_engine_type">' . __('Engine Type', 'motorcycle-manager') . '</label></th>';
        echo '<td><select id="motorcycle_engine_type" name="motorcycle_engine_type">';
        echo '<option value="">' . __('Select Engine Type', 'motorcycle-manager') . '</option>';
        $engine_types = array('Single Cylinder', 'Parallel Twin', 'V-Twin', 'Inline-4', 'V4', 'Boxer', 'Triple', 'Electric');
        foreach ($engine_types as $type) {
            echo '<option value="' . esc_attr($type) . '"' . selected($engine_type, $type, false) . '>' . esc_html($type) . '</option>';
        }
        echo '</select></td></tr>';
        
        echo '<tr><th><label for="motorcycle_power">' . __('Power (HP)', 'motorcycle-manager') . '</label></th>';
        echo '<td><input type="number" id="motorcycle_power" name="motorcycle_power" value="' . esc_attr($power) . '" step="0.1" /></td></tr>';
        
        echo '<tr><th><label for="motorcycle_torque">' . __('Torque (Nm)', 'motorcycle-manager') . '</label></th>';
        echo '<td><input type="number" id="motorcycle_torque" name="motorcycle_torque" value="' . esc_attr($torque) . '" step="0.1" /></td></tr>';
        
        echo '<tr><th><label for="motorcycle_weight">' . __('Weight (kg)', 'motorcycle-manager') . '</label></th>';
        echo '<td><input type="number" id="motorcycle_weight" name="motorcycle_weight" value="' . esc_attr($weight) . '" step="0.1" /></td></tr>';
        
        echo '<tr><th><label for="motorcycle_fuel_capacity">' . __('Fuel Capacity (L)', 'motorcycle-manager') . '</label></th>';
        echo '<td><input type="number" id="motorcycle_fuel_capacity" name="motorcycle_fuel_capacity" value="' . esc_attr($fuel_capacity) . '" step="0.1" /></td></tr>';
        
        echo '<tr><th><label for="motorcycle_mileage">' . __('Mileage (km)', 'motorcycle-manager') . '</label></th>';
        echo '<td><input type="number" id="motorcycle_mileage" name="motorcycle_mileage" value="' . esc_attr($mileage) . '" /></td></tr>';
        
        echo '<tr><th><label for="motorcycle_color">' . __('Color', 'motorcycle-manager') . '</label></th>';
        echo '<td><input type="text" id="motorcycle_color" name="motorcycle_color" value="' . esc_attr($color) . '" /></td></tr>';
        
        echo '</table>';
    }
    
    public function pricing_meta_box_callback($post) {
        $price = get_post_meta($post->ID, '_motorcycle_price', true);
        $currency = get_post_meta($post->ID, '_motorcycle_currency', true) ?: 'USD';
        $availability = get_post_meta($post->ID, '_motorcycle_availability', true) ?: 'available';
        $location = get_post_meta($post->ID, '_motorcycle_location', true);
        
        echo '<p><label for="motorcycle_price"><strong>' . __('Price', 'motorcycle-manager') . '</strong></label><br>';
        echo '<input type="number" id="motorcycle_price" name="motorcycle_price" value="' . esc_attr($price) . '" step="0.01" style="width: 100%;" /></p>';
        
        echo '<p><label for="motorcycle_currency"><strong>' . __('Currency', 'motorcycle-manager') . '</strong></label><br>';
        echo '<select id="motorcycle_currency" name="motorcycle_currency" style="width: 100%;">';
        $currencies = array('USD' => 'USD ($)', 'EUR' => 'EUR (€)', 'GBP' => 'GBP (£)', 'CAD' => 'CAD (C$)', 'AUD' => 'AUD (A$)');
        foreach ($currencies as $code => $label) {
            echo '<option value="' . esc_attr($code) . '"' . selected($currency, $code, false) . '>' . esc_html($label) . '</option>';
        }
        echo '</select></p>';
        
        echo '<p><label for="motorcycle_availability"><strong>' . __('Availability', 'motorcycle-manager') . '</strong></label><br>';
        echo '<select id="motorcycle_availability" name="motorcycle_availability" style="width: 100%;">';
        $statuses = array('available' => __('Available', 'motorcycle-manager'), 'reserved' => __('Reserved', 'motorcycle-manager'), 'sold' => __('Sold', 'motorcycle-manager'));
        foreach ($statuses as $value => $label) {
            echo '<option value="' . esc_attr($value) . '"' . selected($availability, $value, false) . '>' . esc_html($label) . '</option>';
        }
        echo '</select></p>';
        
        echo '<p><label for="motorcycle_location"><strong>' . __('Location', 'motorcycle-manager') . '</strong></label><br>';
        echo '<input type="text" id="motorcycle_location" name="motorcycle_location" value="' . esc_attr($location) . '" style="width: 100%;" placeholder="' . __('e.g., San Francisco, CA', 'motorcycle-manager') . '" /></p>';
    }
    
    public function ai_content_meta_box_callback($post) {
        $ai_description = get_post_meta($post->ID, '_motorcycle_ai_description', true);
        $ai_highlights = get_post_meta($post->ID, '_motorcycle_ai_highlights', true);
        
        echo '<div id="ai-content-section">';
        
        echo '<h4>' . __('AI-Generated Description', 'motorcycle-manager') . '</h4>';
        echo '<p><button type="button" id="generate-description" class="button">' . __('Generate Description', 'motorcycle-manager') . '</button> ';
        echo '<span id="description-loading" style="display:none;">' . __('Generating...', 'motorcycle-manager') . '</span></p>';
        echo '<textarea id="motorcycle_ai_description" name="motorcycle_ai_description" rows="4" style="width: 100%;" placeholder="' . __('AI-generated description will appear here...', 'motorcycle-manager') . '">' . esc_textarea($ai_description) . '</textarea>';
        
        echo '<h4>' . __('AI-Generated Highlights', 'motorcycle-manager') . '</h4>';
        echo '<p><button type="button" id="generate-highlights" class="button">' . __('Generate Highlights', 'motorcycle-manager') . '</button> ';
        echo '<span id="highlights-loading" style="display:none;">' . __('Generating...', 'motorcycle-manager') . '</span></p>';
        echo '<textarea id="motorcycle_ai_highlights" name="motorcycle_ai_highlights" rows="3" style="width: 100%;" placeholder="' . __('AI-generated highlights will appear here...', 'motorcycle-manager') . '">' . esc_textarea($ai_highlights) . '</textarea>';
        
        echo '<p class="description">' . __('AI content generation requires OpenAI API configuration in the webhook service.', 'motorcycle-manager') . '</p>';
        
        echo '</div>';
    }

    public function save_motorcycle_meta($post_id) {
        if (!isset($_POST['motorcycle_meta_box_nonce'])) {
            return;
        }

        if (!wp_verify_nonce($_POST['motorcycle_meta_box_nonce'], 'motorcycle_meta_box')) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (isset($_POST['post_type']) && 'motorcycle' == $_POST['post_type']) {
            if (!current_user_can('edit_page', $post_id)) {
                return;
            }
        } else {
            if (!current_user_can('edit_post', $post_id)) {
                return;
            }
        }

        // Save specification fields
        $spec_fields = array(
            'motorcycle_year', 'motorcycle_engine_size', 'motorcycle_engine_type',
            'motorcycle_power', 'motorcycle_torque', 'motorcycle_weight',
            'motorcycle_fuel_capacity', 'motorcycle_mileage', 'motorcycle_color'
        );

        foreach ($spec_fields as $field) {
            if (isset($_POST[$field])) {
                update_post_meta($post_id, '_' . $field, sanitize_text_field($_POST[$field]));
            }
        }

        // Save pricing fields
        $pricing_fields = array(
            'motorcycle_price', 'motorcycle_currency', 'motorcycle_availability', 'motorcycle_location'
        );

        foreach ($pricing_fields as $field) {
            if (isset($_POST[$field])) {
                update_post_meta($post_id, '_' . $field, sanitize_text_field($_POST[$field]));
            }
        }

        // Save AI content fields
        if (isset($_POST['motorcycle_ai_description'])) {
            update_post_meta($post_id, '_motorcycle_ai_description', wp_kses_post($_POST['motorcycle_ai_description']));
        }

        if (isset($_POST['motorcycle_ai_highlights'])) {
            update_post_meta($post_id, '_motorcycle_ai_highlights', wp_kses_post($_POST['motorcycle_ai_highlights']));
        }

        // Sync with external database if needed
        $this->sync_to_external_db($post_id);
    }

    public function sync_to_external_db($post_id) {
        // Get webhook base URL from environment or settings
        $webhook_url = defined('WEBHOOK_BASE_URL') ? WEBHOOK_BASE_URL : 'http://webhook:8090';

        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'motorcycle') {
            return;
        }

        // Prepare motorcycle data for sync
        $motorcycle_data = array(
            'wp_post_id' => $post_id,
            'title' => $post->post_title,
            'description' => $post->post_content,
            'price' => get_post_meta($post_id, '_motorcycle_price', true),
            'currency' => get_post_meta($post_id, '_motorcycle_currency', true) ?: 'USD',
            'availability' => get_post_meta($post_id, '_motorcycle_availability', true) ?: 'available',
            'location' => get_post_meta($post_id, '_motorcycle_location', true),
            'specs' => array(
                'year' => get_post_meta($post_id, '_motorcycle_year', true),
                'engine_size' => get_post_meta($post_id, '_motorcycle_engine_size', true),
                'engine_type' => get_post_meta($post_id, '_motorcycle_engine_type', true),
                'power' => get_post_meta($post_id, '_motorcycle_power', true),
                'torque' => get_post_meta($post_id, '_motorcycle_torque', true),
                'weight' => get_post_meta($post_id, '_motorcycle_weight', true),
                'fuel_capacity' => get_post_meta($post_id, '_motorcycle_fuel_capacity', true),
                'mileage' => get_post_meta($post_id, '_motorcycle_mileage', true),
                'color' => get_post_meta($post_id, '_motorcycle_color', true)
            ),
            'ai_content' => array(
                'description' => get_post_meta($post_id, '_motorcycle_ai_description', true),
                'highlights' => get_post_meta($post_id, '_motorcycle_ai_highlights', true)
            )
        );

        // Add featured image URL if exists
        if (has_post_thumbnail($post_id)) {
            $motorcycle_data['featured_image'] = get_the_post_thumbnail_url($post_id, 'full');
        }

        // Send to webhook service (async, don't block the save)
        wp_remote_post($webhook_url . '/webhook/motorcycle/sync', array(
            'timeout' => 5,
            'blocking' => false,
            'body' => json_encode($motorcycle_data),
            'headers' => array(
                'Content-Type' => 'application/json'
            )
        ));
    }

    public function ajax_generate_description() {
        check_ajax_referer('motorcycle_ai_nonce', 'nonce');

        if (!current_user_can('edit_posts')) {
            wp_die(__('You do not have sufficient permissions to access this page.'));
        }

        $post_id = intval($_POST['post_id']);
        $post = get_post($post_id);

        if (!$post || $post->post_type !== 'motorcycle') {
            wp_send_json_error(__('Invalid motorcycle post.', 'motorcycle-manager'));
        }

        // Gather motorcycle data for AI context
        $context = array(
            'title' => $post->post_title,
            'year' => get_post_meta($post_id, '_motorcycle_year', true),
            'engine_size' => get_post_meta($post_id, '_motorcycle_engine_size', true),
            'engine_type' => get_post_meta($post_id, '_motorcycle_engine_type', true),
            'power' => get_post_meta($post_id, '_motorcycle_power', true),
            'price' => get_post_meta($post_id, '_motorcycle_price', true),
            'currency' => get_post_meta($post_id, '_motorcycle_currency', true)
        );

        $prompt = "Generate a compelling sales description for this motorcycle: " . $post->post_title;

        $description = $this->call_ai_service($prompt, $context, 'description');

        if ($description) {
            update_post_meta($post_id, '_motorcycle_ai_description', $description);
            wp_send_json_success(array('description' => $description));
        } else {
            wp_send_json_error(__('Failed to generate description. Please check AI service configuration.', 'motorcycle-manager'));
        }
    }

    public function ajax_generate_highlights() {
        check_ajax_referer('motorcycle_ai_nonce', 'nonce');

        if (!current_user_can('edit_posts')) {
            wp_die(__('You do not have sufficient permissions to access this page.'));
        }

        $post_id = intval($_POST['post_id']);
        $post = get_post($post_id);

        if (!$post || $post->post_type !== 'motorcycle') {
            wp_send_json_error(__('Invalid motorcycle post.', 'motorcycle-manager'));
        }

        // Gather motorcycle data for AI context
        $context = array(
            'title' => $post->post_title,
            'year' => get_post_meta($post_id, '_motorcycle_year', true),
            'engine_size' => get_post_meta($post_id, '_motorcycle_engine_size', true),
            'engine_type' => get_post_meta($post_id, '_motorcycle_engine_type', true),
            'power' => get_post_meta($post_id, '_motorcycle_power', true)
        );

        $prompt = "Generate 3-5 key selling points/highlights for this motorcycle: " . $post->post_title;

        $highlights = $this->call_ai_service($prompt, $context, 'highlights');

        if ($highlights) {
            update_post_meta($post_id, '_motorcycle_ai_highlights', $highlights);
            wp_send_json_success(array('highlights' => $highlights));
        } else {
            wp_send_json_error(__('Failed to generate highlights. Please check AI service configuration.', 'motorcycle-manager'));
        }
    }

    private function call_ai_service($prompt, $context, $type) {
        $webhook_url = defined('WEBHOOK_BASE_URL') ? WEBHOOK_BASE_URL : 'http://webhook:8090';

        $response = wp_remote_post($webhook_url . '/webhook/variants', array(
            'timeout' => 30,
            'body' => array(
                'prompt' => $prompt,
                'context' => json_encode($context),
                'type' => $type,
                'count' => 1
            )
        ));

        if (is_wp_error($response)) {
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (isset($data['variants'][0]['message'])) {
            return $data['variants'][0]['message'];
        }

        return false;
    }

    public function add_admin_columns($columns) {
        $new_columns = array();
        $new_columns['cb'] = $columns['cb'];
        $new_columns['title'] = $columns['title'];
        $new_columns['motorcycle_image'] = __('Image', 'motorcycle-manager');
        $new_columns['motorcycle_price'] = __('Price', 'motorcycle-manager');
        $new_columns['motorcycle_year'] = __('Year', 'motorcycle-manager');
        $new_columns['motorcycle_engine'] = __('Engine', 'motorcycle-manager');
        $new_columns['motorcycle_availability'] = __('Status', 'motorcycle-manager');
        $new_columns['motorcycle_brand'] = $columns['taxonomy-motorcycle_brand'];
        $new_columns['motorcycle_type'] = $columns['taxonomy-motorcycle_type'];
        $new_columns['date'] = $columns['date'];

        return $new_columns;
    }

    public function admin_column_content($column, $post_id) {
        switch ($column) {
            case 'motorcycle_image':
                if (has_post_thumbnail($post_id)) {
                    echo get_the_post_thumbnail($post_id, array(50, 50));
                } else {
                    echo '<span class="dashicons dashicons-camera" style="font-size: 30px; color: #ccc;"></span>';
                }
                break;

            case 'motorcycle_price':
                $price = get_post_meta($post_id, '_motorcycle_price', true);
                $currency = get_post_meta($post_id, '_motorcycle_currency', true) ?: 'USD';
                if ($price) {
                    echo esc_html($currency . ' ' . number_format($price, 2));
                } else {
                    echo '—';
                }
                break;

            case 'motorcycle_year':
                $year = get_post_meta($post_id, '_motorcycle_year', true);
                echo $year ? esc_html($year) : '—';
                break;

            case 'motorcycle_engine':
                $size = get_post_meta($post_id, '_motorcycle_engine_size', true);
                $type = get_post_meta($post_id, '_motorcycle_engine_type', true);
                if ($size || $type) {
                    echo esc_html(($size ? $size . 'cc' : '') . ($size && $type ? ' ' : '') . ($type ? $type : ''));
                } else {
                    echo '—';
                }
                break;

            case 'motorcycle_availability':
                $availability = get_post_meta($post_id, '_motorcycle_availability', true) ?: 'available';
                $status_colors = array(
                    'available' => 'green',
                    'reserved' => 'orange',
                    'sold' => 'red'
                );
                $color = isset($status_colors[$availability]) ? $status_colors[$availability] : 'gray';
                echo '<span style="color: ' . esc_attr($color) . '; font-weight: bold;">' . esc_html(ucfirst($availability)) . '</span>';
                break;
        }
    }

    public function sortable_columns($columns) {
        $columns['motorcycle_price'] = 'motorcycle_price';
        $columns['motorcycle_year'] = 'motorcycle_year';
        return $columns;
    }

    public function enqueue_scripts() {
        if (is_singular('motorcycle') || is_post_type_archive('motorcycle')) {
            wp_enqueue_style('motorcycle-manager-frontend', MOTORCYCLE_MANAGER_PLUGIN_URL . 'assets/frontend.css', array(), MOTORCYCLE_MANAGER_VERSION);
        }
    }

    public function admin_enqueue_scripts($hook) {
        global $post_type;

        if (($hook == 'post.php' || $hook == 'post-new.php') && $post_type == 'motorcycle') {
            wp_enqueue_script('motorcycle-manager-admin', MOTORCYCLE_MANAGER_PLUGIN_URL . 'assets/admin.js', array('jquery'), MOTORCYCLE_MANAGER_VERSION, true);
            wp_localize_script('motorcycle-manager-admin', 'motorcycleAjax', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('motorcycle_ai_nonce'),
                'post_id' => get_the_ID()
            ));
        }
    }
}

// Initialize the plugin
new MotorcycleManager();

// Activation hook
register_activation_hook(__FILE__, 'motorcycle_manager_activate');
function motorcycle_manager_activate() {
    // Create the motorcycle post type
    $motorcycle_manager = new MotorcycleManager();
    $motorcycle_manager->register_post_type();
    $motorcycle_manager->register_taxonomies();

    // Flush rewrite rules
    flush_rewrite_rules();

    // Create default terms
    if (!term_exists('Yamaha', 'motorcycle_brand')) {
        wp_insert_term('Yamaha', 'motorcycle_brand');
    }
    if (!term_exists('Honda', 'motorcycle_brand')) {
        wp_insert_term('Honda', 'motorcycle_brand');
    }
    if (!term_exists('BMW', 'motorcycle_brand')) {
        wp_insert_term('BMW', 'motorcycle_brand');
    }
    if (!term_exists('Kawasaki', 'motorcycle_brand')) {
        wp_insert_term('Kawasaki', 'motorcycle_brand');
    }

    if (!term_exists('Sport', 'motorcycle_type')) {
        wp_insert_term('Sport', 'motorcycle_type');
    }
    if (!term_exists('Cruiser', 'motorcycle_type')) {
        wp_insert_term('Cruiser', 'motorcycle_type');
    }
    if (!term_exists('Adventure', 'motorcycle_type')) {
        wp_insert_term('Adventure', 'motorcycle_type');
    }
    if (!term_exists('Touring', 'motorcycle_type')) {
        wp_insert_term('Touring', 'motorcycle_type');
    }
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'motorcycle_manager_deactivate');
function motorcycle_manager_deactivate() {
    flush_rewrite_rules();
}
