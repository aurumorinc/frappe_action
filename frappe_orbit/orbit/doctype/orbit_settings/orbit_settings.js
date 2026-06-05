function update_auth_status_ui(frm, is_authorized) {
    frm.page.clear_primary_action();
    frm.page.clear_custom_actions();

    if (is_authorized) {
        frm.page.set_indicator(__('Enabled'), 'green');
        
        frm.page.set_primary_action(__('Deauthorize'), function() {
            frappe.confirm(__('Are you sure you want to deauthorize the Orbit extension?'), () => {
                frappe.call({
                    method: 'frappe_orbit.orbit.doctype.orbit_settings.orbit_settings.deauthorize',
                    callback: function(r) {
                        if (r.message) {
                            frappe.show_alert({
                                message: __('Orbit Extension Deauthorized Successfully!'),
                                indicator: 'green'
                            });
                            update_auth_status_ui(frm, false);
                        }
                    }
                });
            });
        });
    } else {
        frm.page.set_indicator(__('Disabled'), 'red');

        frm.page.set_primary_action(__('Authorize'), function() {
            let $btn = frm.page.btn_primary;
            $btn.prop('disabled', true).text(__('Authorizing...'));

            let authTimeout = setTimeout(() => {
                frappe.show_alert({
                    message: __('Authorization timed out. Please ensure the Orbit extension is installed and active.'),
                    indicator: 'red'
                });
                $btn.prop('disabled', false).text(__('Authorize'));
            }, 5000);

            // Store timeout ID on the window object so the event listener can clear it
            window._orbitAuthTimeout = authTimeout;
            window._orbitAuthBtn = $btn;

            // Request redirect URI from extension
            window.postMessage({ type: "ORBIT_GET_REDIRECT_URI" }, "*");
        });
    }
}

frappe.ui.form.on('Orbit Settings', {
    refresh: function(frm) {
        frappe.call({
            method: 'frappe_orbit.orbit.doctype.orbit_settings.orbit_settings.get_authorization_status',
            callback: function(r) {
                update_auth_status_ui(frm, r.message);
            }
        });
    }
});

window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'ORBIT_REDIRECT_URI') {
        let redirect_uri = event.data.payload.redirect_uri;
        frappe.call({
            method: 'frappe_orbit.orbit.doctype.orbit_settings.orbit_settings.get_or_create_oauth_client',
            args: { redirect_uri: redirect_uri },
            callback: function(r) {
                if (r.message) {
                    window.postMessage({
                        type: "ORBIT_START_AUTH",
                        payload: {
                            siteUrl: window.location.origin,
                            clientId: r.message
                        }
                    }, "*");
                } else {
                    if (window._orbitAuthTimeout) clearTimeout(window._orbitAuthTimeout);
                    frappe.show_alert({
                        message: __('Failed to get OAuth client.'),
                        indicator: 'red'
                    });
                    if (window._orbitAuthBtn) window._orbitAuthBtn.prop('disabled', false).text(__('Authorize'));
                }
            },
            error: function() {
                if (window._orbitAuthTimeout) clearTimeout(window._orbitAuthTimeout);
                if (window._orbitAuthBtn) window._orbitAuthBtn.prop('disabled', false).text(__('Authorize'));
            }
        });
    } else if (event.data && event.data.type === 'ORBIT_AUTH_SUCCESS') {
        if (window._orbitAuthTimeout) clearTimeout(window._orbitAuthTimeout);
        if (window._orbitAuthBtn) window._orbitAuthBtn.prop('disabled', false).text(__('Authorize'));
        
        frappe.show_alert({
            message: __('Orbit Extension Authorized Successfully!'),
            indicator: 'green'
        });
        
        if (cur_frm && cur_frm.doctype === 'Orbit Settings') {
            update_auth_status_ui(cur_frm, true);
        }
    } else if (event.data && event.data.type === 'ORBIT_AUTH_FAILED') {
        if (window._orbitAuthTimeout) clearTimeout(window._orbitAuthTimeout);
        if (window._orbitAuthBtn) window._orbitAuthBtn.prop('disabled', false).text(__('Authorize'));
        
        frappe.show_alert({
            message: __('Orbit Extension Authorization Failed: ') + (event.data.error || __('Unknown error')),
            indicator: 'red'
        });
    }
});
