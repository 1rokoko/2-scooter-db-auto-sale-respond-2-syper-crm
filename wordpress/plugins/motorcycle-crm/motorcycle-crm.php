<?php
/**
 * Plugin Name: Motorcycle CRM Dashboard
 * Plugin URI: https://github.com/1rokoko/2-scooter-db-auto-sale-respond-2-syper-crm
 * Description: CRM dashboard for managing hot deals, reminders, and customer interactions
 * Version: 1.0.0
 * Author: Motorcycle Marketplace Team
 * License: GPL v2 or later
 * Text Domain: motorcycle-crm
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('MOTORCYCLE_CRM_VERSION', '1.0.0');
define('MOTORCYCLE_CRM_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('MOTORCYCLE_CRM_PLUGIN_URL', plugin_dir_url(__FILE__));

class MotorcycleCRM {
    
    private $webhook_url;
    
    public function __construct() {
        $this->webhook_url = defined('WEBHOOK_BASE_URL') ? WEBHOOK_BASE_URL : 'http://webhook:8090';
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('wp_ajax_mark_reminder_sent', array($this, 'ajax_mark_reminder_sent'));
        add_action('wp_ajax_refresh_hot_deals', array($this, 'ajax_refresh_hot_deals'));
        add_action('wp_ajax_send_manual_message', array($this, 'ajax_send_manual_message'));
        
        // Add dashboard widget
        add_action('wp_dashboard_setup', array($this, 'add_dashboard_widget'));
        
        // Schedule automatic data sync
        add_action('init', array($this, 'schedule_data_sync'));
        add_action('motorcycle_crm_sync_data', array($this, 'sync_external_data'));
    }
    
    public function add_admin_menu() {
        add_menu_page(
            __('CRM Dashboard', 'motorcycle-crm'),
            __('CRM Dashboard', 'motorcycle-crm'),
            'manage_options',
            'motorcycle-crm',
            array($this, 'crm_dashboard_page'),
            'dashicons-businessman',
            30
        );
        
        add_submenu_page(
            'motorcycle-crm',
            __('Hot Deals', 'motorcycle-crm'),
            __('Hot Deals', 'motorcycle-crm'),
            'manage_options',
            'motorcycle-crm-deals',
            array($this, 'hot_deals_page')
        );
        
        add_submenu_page(
            'motorcycle-crm',
            __('Reminders', 'motorcycle-crm'),
            __('Reminders', 'motorcycle-crm'),
            'manage_options',
            'motorcycle-crm-reminders',
            array($this, 'reminders_page')
        );
        
        add_submenu_page(
            'motorcycle-crm',
            __('Analytics', 'motorcycle-crm'),
            __('Analytics', 'motorcycle-crm'),
            'manage_options',
            'motorcycle-crm-analytics',
            array($this, 'analytics_page')
        );
    }
    
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'motorcycle-crm') !== false) {
            wp_enqueue_script('motorcycle-crm-admin', MOTORCYCLE_CRM_PLUGIN_URL . 'assets/crm-admin.js', array('jquery'), MOTORCYCLE_CRM_VERSION, true);
            wp_enqueue_style('motorcycle-crm-admin', MOTORCYCLE_CRM_PLUGIN_URL . 'assets/crm-admin.css', array(), MOTORCYCLE_CRM_VERSION);
            
            wp_localize_script('motorcycle-crm-admin', 'motorcycleCrmAjax', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('motorcycle_crm_nonce'),
                'webhook_url' => $this->webhook_url
            ));
        }
    }
    
    public function crm_dashboard_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('CRM Dashboard', 'motorcycle-crm'); ?></h1>
            
            <div class="crm-dashboard-grid">
                <div class="crm-widget">
                    <h3><?php _e('Quick Stats', 'motorcycle-crm'); ?></h3>
                    <div id="quick-stats" class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-number" id="total-deals">-</span>
                            <span class="stat-label"><?php _e('Active Deals', 'motorcycle-crm'); ?></span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number" id="pending-reminders">-</span>
                            <span class="stat-label"><?php _e('Pending Reminders', 'motorcycle-crm'); ?></span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number" id="total-revenue">-</span>
                            <span class="stat-label"><?php _e('Potential Revenue', 'motorcycle-crm'); ?></span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number" id="conversion-rate">-</span>
                            <span class="stat-label"><?php _e('Conversion Rate', 'motorcycle-crm'); ?></span>
                        </div>
                    </div>
                </div>
                
                <div class="crm-widget">
                    <h3><?php _e('Recent Hot Deals', 'motorcycle-crm'); ?></h3>
                    <div id="recent-deals">
                        <p><?php _e('Loading deals...', 'motorcycle-crm'); ?></p>
                    </div>
                    <p>
                        <a href="<?php echo admin_url('admin.php?page=motorcycle-crm-deals'); ?>" class="button button-primary">
                            <?php _e('View All Deals', 'motorcycle-crm'); ?>
                        </a>
                    </p>
                </div>
                
                <div class="crm-widget">
                    <h3><?php _e('Upcoming Reminders', 'motorcycle-crm'); ?></h3>
                    <div id="upcoming-reminders">
                        <p><?php _e('Loading reminders...', 'motorcycle-crm'); ?></p>
                    </div>
                    <p>
                        <a href="<?php echo admin_url('admin.php?page=motorcycle-crm-reminders'); ?>" class="button button-primary">
                            <?php _e('Manage Reminders', 'motorcycle-crm'); ?>
                        </a>
                    </p>
                </div>
                
                <div class="crm-widget">
                    <h3><?php _e('Quick Actions', 'motorcycle-crm'); ?></h3>
                    <div class="quick-actions">
                        <button id="refresh-data" class="button button-secondary">
                            <?php _e('Refresh Data', 'motorcycle-crm'); ?>
                        </button>
                        <button id="send-bulk-reminders" class="button button-secondary">
                            <?php _e('Send Pending Reminders', 'motorcycle-crm'); ?>
                        </button>
                        <a href="<?php echo admin_url('post-new.php?post_type=motorcycle'); ?>" class="button button-primary">
                            <?php _e('Add New Motorcycle', 'motorcycle-crm'); ?>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            // Load dashboard data
            loadDashboardData();
            
            // Auto-refresh every 5 minutes
            setInterval(loadDashboardData, 300000);
            
            $('#refresh-data').on('click', function() {
                $(this).prop('disabled', true).text('<?php _e('Refreshing...', 'motorcycle-crm'); ?>');
                loadDashboardData();
                setTimeout(() => {
                    $(this).prop('disabled', false).text('<?php _e('Refresh Data', 'motorcycle-crm'); ?>');
                }, 2000);
            });
        });
        
        function loadDashboardData() {
            // Load hot deals
            jQuery.get(motorcycleCrmAjax.webhook_url + '/webhook/deals/hot')
                .done(function(data) {
                    updateQuickStats(data.deals);
                    updateRecentDeals(data.deals);
                })
                .fail(function() {
                    jQuery('#recent-deals').html('<p class="error"><?php _e('Failed to load deals data.', 'motorcycle-crm'); ?></p>');
                });
        }
        
        function updateQuickStats(deals) {
            jQuery('#total-deals').text(deals.length);
            
            var totalRevenue = deals.reduce(function(sum, deal) {
                return sum + (parseFloat(deal.amount) || 0);
            }, 0);
            
            jQuery('#total-revenue').text('$' + totalRevenue.toLocaleString());
            jQuery('#pending-reminders').text(deals.filter(d => d.stage === 'negotiation').length);
            jQuery('#conversion-rate').text('75%'); // Placeholder
        }
        
        function updateRecentDeals(deals) {
            var html = '';
            deals.slice(0, 5).forEach(function(deal) {
                html += '<div class="deal-item">';
                html += '<strong>' + deal.full_name + '</strong> - ';
                html += deal.currency + ' ' + parseFloat(deal.amount).toLocaleString();
                html += ' <span class="deal-stage deal-stage-' + deal.stage + '">' + deal.stage + '</span>';
                html += '</div>';
            });
            
            if (html === '') {
                html = '<p><?php _e('No active deals found.', 'motorcycle-crm'); ?></p>';
            }
            
            jQuery('#recent-deals').html(html);
        }
        </script>
        <?php
    }
    
    public function hot_deals_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Hot Deals Management', 'motorcycle-crm'); ?></h1>
            
            <div class="deals-controls">
                <button id="refresh-deals" class="button button-secondary">
                    <?php _e('Refresh Deals', 'motorcycle-crm'); ?>
                </button>
                <select id="filter-stage">
                    <option value=""><?php _e('All Stages', 'motorcycle-crm'); ?></option>
                    <option value="research"><?php _e('Research', 'motorcycle-crm'); ?></option>
                    <option value="negotiation"><?php _e('Negotiation', 'motorcycle-crm'); ?></option>
                    <option value="invoice"><?php _e('Invoice', 'motorcycle-crm'); ?></option>
                </select>
            </div>
            
            <div id="deals-table-container">
                <p><?php _e('Loading deals...', 'motorcycle-crm'); ?></p>
            </div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            loadHotDeals();
            
            $('#refresh-deals').on('click', function() {
                $(this).prop('disabled', true).text('<?php _e('Refreshing...', 'motorcycle-crm'); ?>');
                loadHotDeals();
                setTimeout(() => {
                    $(this).prop('disabled', false).text('<?php _e('Refresh Deals', 'motorcycle-crm'); ?>');
                }, 1000);
            });
            
            $('#filter-stage').on('change', function() {
                filterDeals($(this).val());
            });
        });
        
        function loadHotDeals() {
            jQuery.get(motorcycleCrmAjax.webhook_url + '/webhook/deals/hot')
                .done(function(data) {
                    displayDealsTable(data.deals);
                })
                .fail(function() {
                    jQuery('#deals-table-container').html('<p class="error"><?php _e('Failed to load deals.', 'motorcycle-crm'); ?></p>');
                });
        }
        
        function displayDealsTable(deals) {
            var html = '<table class="wp-list-table widefat fixed striped">';
            html += '<thead><tr>';
            html += '<th><?php _e('Customer', 'motorcycle-crm'); ?></th>';
            html += '<th><?php _e('Phone', 'motorcycle-crm'); ?></th>';
            html += '<th><?php _e('Stage', 'motorcycle-crm'); ?></th>';
            html += '<th><?php _e('Amount', 'motorcycle-crm'); ?></th>';
            html += '<th><?php _e('Expected Close', 'motorcycle-crm'); ?></th>';
            html += '<th><?php _e('Actions', 'motorcycle-crm'); ?></th>';
            html += '</tr></thead><tbody>';
            
            deals.forEach(function(deal) {
                html += '<tr data-stage="' + deal.stage + '">';
                html += '<td><strong>' + deal.full_name + '</strong></td>';
                html += '<td>' + deal.phone + '</td>';
                html += '<td><span class="deal-stage deal-stage-' + deal.stage + '">' + deal.stage + '</span></td>';
                html += '<td>' + deal.currency + ' ' + parseFloat(deal.amount).toLocaleString() + '</td>';
                html += '<td>' + (deal.expected_close || '-') + '</td>';
                html += '<td>';
                html += '<button class="button button-small send-reminder" data-deal-id="' + deal.id + '"><?php _e('Send Reminder', 'motorcycle-crm'); ?></button> ';
                html += '<button class="button button-small view-history" data-deal-id="' + deal.id + '"><?php _e('View History', 'motorcycle-crm'); ?></button>';
                html += '</td>';
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            
            if (deals.length === 0) {
                html = '<p><?php _e('No hot deals found.', 'motorcycle-crm'); ?></p>';
            }
            
            jQuery('#deals-table-container').html(html);
            
            // Bind action buttons
            jQuery('.send-reminder').on('click', function() {
                var dealId = $(this).data('deal-id');
                sendReminder(dealId);
            });
        }
        
        function filterDeals(stage) {
            if (stage === '') {
                jQuery('#deals-table-container tr').show();
            } else {
                jQuery('#deals-table-container tr').hide();
                jQuery('#deals-table-container tr[data-stage="' + stage + '"]').show();
                jQuery('#deals-table-container thead tr').show();
            }
        }
        
        function sendReminder(dealId) {
            // Implementation for sending reminder
            alert('Reminder functionality will be implemented');
        }
        </script>
        <?php
    }
    
    public function reminders_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Reminders Management', 'motorcycle-crm'); ?></h1>
            
            <div class="reminders-controls">
                <button id="refresh-reminders" class="button button-secondary">
                    <?php _e('Refresh Reminders', 'motorcycle-crm'); ?>
                </button>
                <button id="mark-all-sent" class="button button-primary">
                    <?php _e('Mark All as Sent', 'motorcycle-crm'); ?>
                </button>
            </div>
            
            <div id="reminders-container">
                <p><?php _e('Loading reminders...', 'motorcycle-crm'); ?></p>
            </div>
        </div>
        <?php
    }
    
    public function analytics_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('CRM Analytics', 'motorcycle-crm'); ?></h1>
            
            <div class="analytics-grid">
                <div class="analytics-widget">
                    <h3><?php _e('Sales Funnel', 'motorcycle-crm'); ?></h3>
                    <div id="sales-funnel">
                        <p><?php _e('Analytics data will be displayed here.', 'motorcycle-crm'); ?></p>
                    </div>
                </div>
                
                <div class="analytics-widget">
                    <h3><?php _e('Revenue Trends', 'motorcycle-crm'); ?></h3>
                    <div id="revenue-trends">
                        <p><?php _e('Revenue charts will be displayed here.', 'motorcycle-crm'); ?></p>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    public function ajax_mark_reminder_sent() {
        check_ajax_referer('motorcycle_crm_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions.'));
        }
        
        $reminder_id = intval($_POST['reminder_id']);
        
        // Call webhook service to mark reminder as sent
        $response = wp_remote_post($this->webhook_url . '/webhook/reminders/' . $reminder_id . '/mark-sent', array(
            'timeout' => 10,
            'headers' => array('Content-Type' => 'application/json')
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error(__('Failed to update reminder status.', 'motorcycle-crm'));
        }
        
        wp_send_json_success(__('Reminder marked as sent.', 'motorcycle-crm'));
    }
    
    public function ajax_refresh_hot_deals() {
        check_ajax_referer('motorcycle_crm_nonce', 'nonce');
        
        $response = wp_remote_get($this->webhook_url . '/webhook/deals/hot');
        
        if (is_wp_error($response)) {
            wp_send_json_error(__('Failed to fetch deals.', 'motorcycle-crm'));
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        wp_send_json_success($data);
    }
    
    public function add_dashboard_widget() {
        wp_add_dashboard_widget(
            'motorcycle_crm_widget',
            __('CRM Quick View', 'motorcycle-crm'),
            array($this, 'dashboard_widget_content')
        );
    }
    
    public function dashboard_widget_content() {
        ?>
        <div id="crm-widget-content">
            <p><?php _e('Loading CRM data...', 'motorcycle-crm'); ?></p>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            $.get('<?php echo $this->webhook_url; ?>/webhook/deals/hot')
                .done(function(data) {
                    var html = '<ul>';
                    data.deals.slice(0, 3).forEach(function(deal) {
                        html += '<li><strong>' + deal.full_name + '</strong> - ' + deal.stage + ' (' + deal.currency + ' ' + deal.amount + ')</li>';
                    });
                    html += '</ul>';
                    html += '<p><a href="<?php echo admin_url('admin.php?page=motorcycle-crm'); ?>"><?php _e('View Full Dashboard', 'motorcycle-crm'); ?></a></p>';
                    $('#crm-widget-content').html(html);
                })
                .fail(function() {
                    $('#crm-widget-content').html('<p><?php _e('Unable to load CRM data.', 'motorcycle-crm'); ?></p>');
                });
        });
        </script>
        <?php
    }
    
    public function schedule_data_sync() {
        if (!wp_next_scheduled('motorcycle_crm_sync_data')) {
            wp_schedule_event(time(), 'hourly', 'motorcycle_crm_sync_data');
        }
    }
    
    public function sync_external_data() {
        // Sync data between WordPress and external database
        // This would be called hourly to keep data in sync
        
        $response = wp_remote_get($this->webhook_url . '/webhook/deals/hot');
        
        if (!is_wp_error($response)) {
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);
            
            // Store synced data in WordPress options for caching
            update_option('motorcycle_crm_last_sync', current_time('mysql'));
            update_option('motorcycle_crm_cached_deals', $data['deals']);
        }
    }
}

// Initialize the plugin
new MotorcycleCRM();

// Activation hook
register_activation_hook(__FILE__, 'motorcycle_crm_activate');
function motorcycle_crm_activate() {
    // Schedule data sync
    wp_schedule_event(time(), 'hourly', 'motorcycle_crm_sync_data');
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'motorcycle_crm_deactivate');
function motorcycle_crm_deactivate() {
    wp_clear_scheduled_hook('motorcycle_crm_sync_data');
}
