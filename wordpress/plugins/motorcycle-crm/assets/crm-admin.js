jQuery(document).ready(function($) {
    
    // Global CRM object
    window.MotorcycleCRM = {
        
        // Show notification
        showNotification: function(message, type) {
            type = type || 'info';
            
            var notification = $('<div class="crm-notification ' + type + '">' + message + '</div>');
            $('body').append(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(function() {
                notification.fadeOut(function() {
                    $(this).remove();
                });
            }, 5000);
            
            // Click to dismiss
            notification.on('click', function() {
                $(this).fadeOut(function() {
                    $(this).remove();
                });
            });
        },
        
        // Format currency
        formatCurrency: function(amount, currency) {
            currency = currency || 'USD';
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency
            }).format(amount);
        },
        
        // Format date
        formatDate: function(dateString) {
            if (!dateString) return '-';
            var date = new Date(dateString);
            return date.toLocaleDateString();
        },
        
        // Load deals data
        loadDeals: function(callback) {
            $.get(motorcycleCrmAjax.webhook_url + '/webhook/deals/hot')
                .done(function(data) {
                    if (callback) callback(data.deals);
                })
                .fail(function() {
                    MotorcycleCRM.showNotification('Failed to load deals data', 'error');
                });
        },
        
        // Mark reminder as sent
        markReminderSent: function(reminderId) {
            $.ajax({
                url: motorcycleCrmAjax.ajax_url,
                type: 'POST',
                data: {
                    action: 'mark_reminder_sent',
                    reminder_id: reminderId,
                    nonce: motorcycleCrmAjax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        MotorcycleCRM.showNotification('Reminder marked as sent', 'success');
                        // Refresh the reminders list
                        if (typeof refreshReminders === 'function') {
                            refreshReminders();
                        }
                    } else {
                        MotorcycleCRM.showNotification('Error: ' + response.data, 'error');
                    }
                },
                error: function() {
                    MotorcycleCRM.showNotification('Failed to update reminder', 'error');
                }
            });
        },
        
        // Send manual message
        sendManualMessage: function(dealId, message, channel) {
            $.ajax({
                url: motorcycleCrmAjax.ajax_url,
                type: 'POST',
                data: {
                    action: 'send_manual_message',
                    deal_id: dealId,
                    message: message,
                    channel: channel,
                    nonce: motorcycleCrmAjax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        MotorcycleCRM.showNotification('Message sent successfully', 'success');
                    } else {
                        MotorcycleCRM.showNotification('Error: ' + response.data, 'error');
                    }
                },
                error: function() {
                    MotorcycleCRM.showNotification('Failed to send message', 'error');
                }
            });
        }
    };
    
    // Auto-refresh functionality
    var autoRefreshInterval;
    
    function startAutoRefresh() {
        autoRefreshInterval = setInterval(function() {
            if ($('#auto-refresh').is(':checked')) {
                refreshCurrentPage();
            }
        }, 60000); // Refresh every minute
    }
    
    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
    }
    
    function refreshCurrentPage() {
        var currentPage = window.location.href;
        
        if (currentPage.includes('motorcycle-crm-deals')) {
            if (typeof loadHotDeals === 'function') {
                loadHotDeals();
            }
        } else if (currentPage.includes('motorcycle-crm-reminders')) {
            if (typeof loadReminders === 'function') {
                loadReminders();
            }
        } else if (currentPage.includes('motorcycle-crm')) {
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        }
    }
    
    // Initialize auto-refresh
    startAutoRefresh();
    
    // Add auto-refresh toggle if not exists
    if ($('#auto-refresh').length === 0) {
        $('.wrap h1').after(
            '<div style="margin: 10px 0;">' +
            '<label><input type="checkbox" id="auto-refresh" checked> Auto-refresh data</label>' +
            '</div>'
        );
    }
    
    // Handle auto-refresh toggle
    $(document).on('change', '#auto-refresh', function() {
        if ($(this).is(':checked')) {
            startAutoRefresh();
            MotorcycleCRM.showNotification('Auto-refresh enabled', 'success');
        } else {
            stopAutoRefresh();
            MotorcycleCRM.showNotification('Auto-refresh disabled', 'info');
        }
    });
    
    // Enhanced table functionality
    $(document).on('click', '.wp-list-table th', function() {
        var table = $(this).closest('table');
        var columnIndex = $(this).index();
        var rows = table.find('tbody tr').get();
        
        rows.sort(function(a, b) {
            var aVal = $(a).children('td').eq(columnIndex).text();
            var bVal = $(b).children('td').eq(columnIndex).text();
            
            // Try to parse as numbers
            var aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
            var bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
            }
            
            return aVal.localeCompare(bVal);
        });
        
        // Toggle sort direction
        if ($(this).hasClass('sorted-asc')) {
            rows.reverse();
            $(this).removeClass('sorted-asc').addClass('sorted-desc');
        } else {
            $(this).removeClass('sorted-desc').addClass('sorted-asc');
        }
        
        // Clear other column sort indicators
        $(this).siblings().removeClass('sorted-asc sorted-desc');
        
        // Rebuild table
        $.each(rows, function(index, row) {
            table.children('tbody').append(row);
        });
    });
    
    // Search functionality
    if ($('#crm-search').length === 0) {
        $('.deals-controls, .reminders-controls').prepend(
            '<input type="text" id="crm-search" placeholder="Search..." style="margin-right: 15px; padding: 6px 8px;">'
        );
    }
    
    $(document).on('input', '#crm-search', function() {
        var searchTerm = $(this).val().toLowerCase();
        var table = $('.wp-list-table tbody');
        
        table.find('tr').each(function() {
            var rowText = $(this).text().toLowerCase();
            if (rowText.includes(searchTerm)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });
    
    // Bulk actions
    $(document).on('change', '.select-all', function() {
        var checked = $(this).is(':checked');
        $('.bulk-select').prop('checked', checked);
        updateBulkActions();
    });
    
    $(document).on('change', '.bulk-select', function() {
        updateBulkActions();
    });
    
    function updateBulkActions() {
        var selectedCount = $('.bulk-select:checked').length;
        var bulkActions = $('#bulk-actions');
        
        if (selectedCount > 0) {
            if (bulkActions.length === 0) {
                $('.deals-controls, .reminders-controls').append(
                    '<div id="bulk-actions" style="margin-left: auto;">' +
                    '<select id="bulk-action-select">' +
                    '<option value="">Bulk Actions</option>' +
                    '<option value="mark-sent">Mark as Sent</option>' +
                    '<option value="send-reminder">Send Reminder</option>' +
                    '<option value="export">Export Selected</option>' +
                    '</select> ' +
                    '<button id="apply-bulk-action" class="button">Apply</button>' +
                    '</div>'
                );
            }
            bulkActions.show();
        } else {
            bulkActions.hide();
        }
    }
    
    $(document).on('click', '#apply-bulk-action', function() {
        var action = $('#bulk-action-select').val();
        var selected = $('.bulk-select:checked').map(function() {
            return $(this).val();
        }).get();
        
        if (!action || selected.length === 0) {
            MotorcycleCRM.showNotification('Please select an action and items', 'warning');
            return;
        }
        
        switch (action) {
            case 'mark-sent':
                selected.forEach(function(id) {
                    MotorcycleCRM.markReminderSent(id);
                });
                break;
            case 'send-reminder':
                MotorcycleCRM.showNotification('Sending reminders...', 'info');
                // Implementation for bulk reminder sending
                break;
            case 'export':
                exportSelected(selected);
                break;
        }
    });
    
    function exportSelected(ids) {
        var csvContent = "data:text/csv;charset=utf-8,";
        
        // Add headers
        var headers = $('.wp-list-table thead th').map(function() {
            return $(this).text().trim();
        }).get();
        csvContent += headers.join(",") + "\n";
        
        // Add selected rows
        ids.forEach(function(id) {
            var row = $('.bulk-select[value="' + id + '"]').closest('tr');
            var rowData = row.find('td').map(function() {
                return '"' + $(this).text().trim().replace(/"/g, '""') + '"';
            }).get();
            csvContent += rowData.join(",") + "\n";
        });
        
        // Download
        var encodedUri = encodeURI(csvContent);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "crm-export-" + new Date().toISOString().split('T')[0] + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        MotorcycleCRM.showNotification('Export completed', 'success');
    }
    
    // Keyboard shortcuts
    $(document).on('keydown', function(e) {
        // Ctrl+R or Cmd+R: Refresh data
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 82) {
            e.preventDefault();
            refreshCurrentPage();
            MotorcycleCRM.showNotification('Data refreshed', 'info');
        }
        
        // Ctrl+F or Cmd+F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 70) {
            e.preventDefault();
            $('#crm-search').focus();
        }
    });
    
    // Add keyboard shortcuts help
    if ($('.keyboard-shortcuts-help').length === 0) {
        $('body').append(
            '<div class="keyboard-shortcuts-help" style="position: fixed; bottom: 20px; right: 20px; background: #333; color: #fff; padding: 10px; border-radius: 4px; font-size: 12px; display: none; z-index: 9999;">' +
            '<strong>Keyboard Shortcuts:</strong><br>' +
            'Ctrl+R: Refresh data<br>' +
            'Ctrl+F: Focus search<br>' +
            'Press ? to toggle this help' +
            '</div>'
        );
    }
    
    $(document).on('keydown', function(e) {
        if (e.keyCode === 191 && !e.ctrlKey && !e.metaKey) { // ? key
            $('.keyboard-shortcuts-help').toggle();
        }
    });
    
    // Connection status indicator
    function checkConnection() {
        $.get(motorcycleCrmAjax.webhook_url + '/healthz')
            .done(function() {
                updateConnectionStatus(true);
            })
            .fail(function() {
                updateConnectionStatus(false);
            });
    }
    
    function updateConnectionStatus(connected) {
        var indicator = $('#connection-status');
        
        if (indicator.length === 0) {
            $('.wrap h1').append(
                '<span id="connection-status" style="margin-left: 15px; font-size: 14px; font-weight: normal;"></span>'
            );
            indicator = $('#connection-status');
        }
        
        if (connected) {
            indicator.html('<span class="status-indicator active"></span>Connected');
        } else {
            indicator.html('<span class="status-indicator inactive"></span>Disconnected');
        }
    }
    
    // Check connection every 30 seconds
    checkConnection();
    setInterval(checkConnection, 30000);
    
    // Initialize tooltips
    $('[data-tooltip]').hover(
        function() {
            var tooltip = $('<div class="crm-tooltip-content">' + $(this).data('tooltip') + '</div>');
            $('body').append(tooltip);
            
            var offset = $(this).offset();
            tooltip.css({
                position: 'absolute',
                top: offset.top - tooltip.outerHeight() - 5,
                left: offset.left + ($(this).outerWidth() / 2) - (tooltip.outerWidth() / 2),
                background: '#333',
                color: '#fff',
                padding: '5px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                zIndex: 9999
            });
        },
        function() {
            $('.crm-tooltip-content').remove();
        }
    );
});
