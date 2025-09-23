jQuery(document).ready(function($) {
    
    // Generate AI Description
    $('#generate-description').on('click', function() {
        var button = $(this);
        var loadingSpan = $('#description-loading');
        var textarea = $('#motorcycle_ai_description');
        
        button.prop('disabled', true);
        loadingSpan.show();
        
        $.ajax({
            url: motorcycleAjax.ajax_url,
            type: 'POST',
            data: {
                action: 'generate_motorcycle_description',
                post_id: motorcycleAjax.post_id,
                nonce: motorcycleAjax.nonce
            },
            success: function(response) {
                if (response.success) {
                    textarea.val(response.data.description);
                    showNotice('Description generated successfully!', 'success');
                } else {
                    showNotice('Error: ' + response.data, 'error');
                }
            },
            error: function() {
                showNotice('Failed to connect to AI service. Please try again.', 'error');
            },
            complete: function() {
                button.prop('disabled', false);
                loadingSpan.hide();
            }
        });
    });
    
    // Generate AI Highlights
    $('#generate-highlights').on('click', function() {
        var button = $(this);
        var loadingSpan = $('#highlights-loading');
        var textarea = $('#motorcycle_ai_highlights');
        
        button.prop('disabled', true);
        loadingSpan.show();
        
        $.ajax({
            url: motorcycleAjax.ajax_url,
            type: 'POST',
            data: {
                action: 'generate_motorcycle_highlights',
                post_id: motorcycleAjax.post_id,
                nonce: motorcycleAjax.nonce
            },
            success: function(response) {
                if (response.success) {
                    textarea.val(response.data.highlights);
                    showNotice('Highlights generated successfully!', 'success');
                } else {
                    showNotice('Error: ' + response.data, 'error');
                }
            },
            error: function() {
                showNotice('Failed to connect to AI service. Please try again.', 'error');
            },
            complete: function() {
                button.prop('disabled', false);
                loadingSpan.hide();
            }
        });
    });
    
    // Auto-calculate power-to-weight ratio
    $('#motorcycle_power, #motorcycle_weight').on('input', function() {
        var power = parseFloat($('#motorcycle_power').val()) || 0;
        var weight = parseFloat($('#motorcycle_weight').val()) || 0;
        
        if (power > 0 && weight > 0) {
            var ratio = (power / weight).toFixed(2);
            var ratioDisplay = $('#power-weight-ratio');
            
            if (ratioDisplay.length === 0) {
                $('#motorcycle_weight').parent().append(
                    '<div id="power-weight-ratio" style="margin-top: 5px; font-size: 12px; color: #666;"></div>'
                );
                ratioDisplay = $('#power-weight-ratio');
            }
            
            ratioDisplay.text('Power-to-weight ratio: ' + ratio + ' HP/kg');
        }
    });
    
    // Price formatting
    $('#motorcycle_price').on('blur', function() {
        var price = parseFloat($(this).val());
        if (!isNaN(price)) {
            $(this).val(price.toFixed(2));
        }
    });
    
    // Year validation
    $('#motorcycle_year').on('input', function() {
        var year = parseInt($(this).val());
        var currentYear = new Date().getFullYear();
        
        if (year > currentYear + 1) {
            $(this).val(currentYear + 1);
            showNotice('Year cannot be more than ' + (currentYear + 1), 'warning');
        } else if (year < 1900) {
            $(this).val(1900);
            showNotice('Year cannot be less than 1900', 'warning');
        }
    });
    
    // Engine size validation
    $('#motorcycle_engine_size').on('input', function() {
        var size = parseInt($(this).val());
        
        if (size > 3000) {
            showNotice('Engine size seems unusually large. Please verify.', 'warning');
        } else if (size < 50 && size > 0) {
            showNotice('Engine size seems unusually small. Please verify.', 'warning');
        }
    });
    
    // Mileage formatting
    $('#motorcycle_mileage').on('blur', function() {
        var mileage = parseInt($(this).val());
        if (!isNaN(mileage) && mileage >= 0) {
            $(this).val(mileage.toLocaleString());
        }
    });
    
    // Show admin notices
    function showNotice(message, type) {
        type = type || 'info';
        var noticeClass = 'notice notice-' + type;
        
        var notice = $('<div class="' + noticeClass + ' is-dismissible"><p>' + message + '</p></div>');
        
        // Remove existing notices
        $('.notice.motorcycle-notice').remove();
        
        // Add new notice
        notice.addClass('motorcycle-notice');
        $('.wrap h1').after(notice);
        
        // Auto-dismiss after 5 seconds
        setTimeout(function() {
            notice.fadeOut(function() {
                $(this).remove();
            });
        }, 5000);
        
        // Make dismissible
        notice.on('click', '.notice-dismiss', function() {
            notice.remove();
        });
    }
    
    // Form validation before submit
    $('#post').on('submit', function(e) {
        var title = $('#title').val().trim();
        var price = $('#motorcycle_price').val();
        var year = $('#motorcycle_year').val();
        
        var errors = [];
        
        if (!title) {
            errors.push('Motorcycle title is required.');
        }
        
        if (price && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
            errors.push('Price must be a valid positive number.');
        }
        
        if (year && (isNaN(parseInt(year)) || parseInt(year) < 1900 || parseInt(year) > new Date().getFullYear() + 1)) {
            errors.push('Year must be between 1900 and ' + (new Date().getFullYear() + 1) + '.');
        }
        
        if (errors.length > 0) {
            e.preventDefault();
            showNotice('Please fix the following errors:\n• ' + errors.join('\n• '), 'error');
            return false;
        }
    });
    
    // Enhanced image upload handling
    if (typeof wp !== 'undefined' && wp.media) {
        var mediaUploader;
        
        // Add gallery button if not exists
        if ($('#motorcycle-gallery-button').length === 0) {
            $('#postimagediv .inside').append(
                '<p><button type="button" id="motorcycle-gallery-button" class="button">Manage Gallery</button></p>'
            );
        }
        
        $('#motorcycle-gallery-button').on('click', function(e) {
            e.preventDefault();
            
            if (mediaUploader) {
                mediaUploader.open();
                return;
            }
            
            mediaUploader = wp.media({
                title: 'Choose Motorcycle Images',
                button: {
                    text: 'Use these images'
                },
                multiple: true,
                library: {
                    type: 'image'
                }
            });
            
            mediaUploader.on('select', function() {
                var attachments = mediaUploader.state().get('selection').toJSON();
                var galleryHtml = '';
                
                attachments.forEach(function(attachment) {
                    galleryHtml += '<img src="' + attachment.sizes.thumbnail.url + '" style="width: 80px; height: 80px; margin: 5px; border: 1px solid #ddd;" />';
                });
                
                if ($('#motorcycle-gallery-preview').length === 0) {
                    $('#motorcycle-gallery-button').after('<div id="motorcycle-gallery-preview" style="margin-top: 10px;"></div>');
                }
                
                $('#motorcycle-gallery-preview').html(galleryHtml);
                showNotice('Gallery updated! Remember to save the post.', 'success');
            });
            
            mediaUploader.open();
        });
    }
    
    // Auto-save draft functionality
    var autoSaveTimer;
    var formChanged = false;
    
    $('#post input, #post textarea, #post select').on('change input', function() {
        formChanged = true;
        clearTimeout(autoSaveTimer);
        
        autoSaveTimer = setTimeout(function() {
            if (formChanged && $('#auto_draft').val() !== '1') {
                // Trigger WordPress auto-save
                if (typeof autosave !== 'undefined') {
                    autosave();
                    showNotice('Draft auto-saved', 'info');
                }
                formChanged = false;
            }
        }, 30000); // Auto-save after 30 seconds of inactivity
    });
    
    // Initialize tooltips for help text
    $('[title]').each(function() {
        $(this).attr('data-tooltip', $(this).attr('title'));
        $(this).removeAttr('title');
    });
    
    // Add help tooltips
    $('<span class="dashicons dashicons-editor-help" style="color: #666; cursor: help; margin-left: 5px;" title="Click Generate to create AI-powered content based on the motorcycle specifications you\'ve entered."></span>')
        .insertAfter('#generate-description, #generate-highlights');
});

// Utility functions
window.MotorcycleManager = {
    formatCurrency: function(amount, currency) {
        currency = currency || 'USD';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },
    
    validateSpecs: function(specs) {
        var warnings = [];
        
        if (specs.power && specs.engine_size) {
            var powerPerLiter = specs.power / (specs.engine_size / 1000);
            if (powerPerLiter > 200) {
                warnings.push('Very high power per liter (' + powerPerLiter.toFixed(1) + ' HP/L). Please verify.');
            }
        }
        
        if (specs.weight && specs.weight < 100) {
            warnings.push('Weight seems unusually low. Please verify.');
        }
        
        if (specs.fuel_capacity && specs.fuel_capacity > 30) {
            warnings.push('Fuel capacity seems unusually high. Please verify.');
        }
        
        return warnings;
    }
};
