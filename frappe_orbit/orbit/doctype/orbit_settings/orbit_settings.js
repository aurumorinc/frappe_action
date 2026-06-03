frappe.ui.form.on('Orbit Settings', {
    refresh: function(frm) {
        frm.page.set_primary_action('Authorize', function() {
            frappe.call({
                method: 'frappe_orbit.orbit.doctype.orbit_settings.orbit_settings.get_or_create_oauth_client',
                callback: function(r) {
                    if (r.message) {
                        window.postMessage({
                            type: "ORBIT_START_AUTH",
                            payload: {
                                siteUrl: window.location.origin,
                                clientId: r.message
                            }
                        }, "*");
                    }
                }
            });
        });
    }
});

window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'ORBIT_AUTH_SUCCESS') {
        frappe.show_alert({
            message: __('Orbit Extension Authorized Successfully!'),
            indicator: 'green'
        });
    }
});
