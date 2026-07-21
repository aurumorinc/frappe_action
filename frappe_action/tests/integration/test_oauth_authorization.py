import frappe
from frappe.tests import UnitTestCase
from frappe_action.action.doctype.action_settings.action_settings import get_or_create_oauth_client

class TestOAuthAuthorization(UnitTestCase):
    def tearDown(self):
        # Clean up OAuth Client
        client_name = "Action"
        client_id = frappe.db.get_value("OAuth Client", {"app_name": client_name}, "name")
        if client_id:
            frappe.delete_doc("OAuth Client", client_id, ignore_permissions=True, force=True)
        
        if hasattr(frappe.local, "flags"):
            standard_keys = {
                "currently_saving", "redirect_location", "in_install_db", 
                "in_install_app", "in_import", "in_test", "mute_messages", 
                "ignore_links", "mute_emails", "has_dataurl", "new_site", 
                "read_only", "print_messages", "tests_verbose", "in_render_safe_exec"
            }
            keys_to_remove = [k for k in frappe.local.flags if k not in standard_keys]
            for k in keys_to_remove:
                del frappe.local.flags[k]
            frappe.local.flags.currently_saving = []

        if hasattr(frappe.local, "request"):
            frappe.local.request = None
        if hasattr(frappe.local, "form_dict"):
            frappe.local.form_dict = frappe._dict()
        if hasattr(frappe.local, "response"):
            frappe.local.response = frappe._dict()

        frappe.db.rollback()

    def test_oauth_authorize_endpoint_success(self):
        # Setup: Create an OAuth Client with a space-separated redirect_uris string
        target_uri = "https://specific-id.chromiumapp.org/"
        client_id = get_or_create_oauth_client(redirect_uri=target_uri)
        
        # Add another URI to ensure it's space-separated
        get_or_create_oauth_client(redirect_uri="https://another-id.chromiumapp.org/")
        
        # Verify the client has space-separated URIs
        doc = frappe.get_doc("OAuth Client", client_id)
        self.assertIn(" ", doc.redirect_uris)
        self.assertIn(target_uri, doc.redirect_uris)
        
        # Action: Make a GET request to the authorize endpoint
        # The authorize endpoint requires a logged-in user, so we set the session user
        frappe.set_user("Administrator")
        
        # Mock frappe.request
        from werkzeug.test import EnvironBuilder
        from werkzeug.wrappers import Request
        
        builder = EnvironBuilder(
            method='GET',
            path='/api/method/frappe.integrations.oauth2.authorize',
            query_string={
                "client_id": client_id,
                "response_type": "code",
                "redirect_uri": target_uri,
                "scope": "all"
            }
        )
        env = builder.get_environ()
        frappe.local.request = Request(env)
        frappe.local.form_dict = frappe._dict({
            "client_id": client_id,
            "response_type": "code",
            "redirect_uri": target_uri,
            "scope": "all"
        })
        
        # Reset response
        frappe.local.response = frappe._dict()
        
        from frappe.integrations.oauth2 import authorize
        
        # Call the authorize method
        authorize(
            client_id=client_id,
            response_type="code",
            redirect_uri=target_uri,
            scope="all"
        )
        
        # Assertion: The response should be successful (302 Redirect or 200 OK)
        # It should NOT be a 400 Bad Request
        self.assertNotEqual(frappe.local.response.get("http_status_code"), 400)
        
        # If skip_authorization is 1, it should redirect to success_url
        self.assertEqual(frappe.local.response.get("type"), "redirect")
        location = frappe.local.response.get("location", "")
        self.assertTrue(
            "/api/method/frappe.integrations.oauth2.approve" in location or
            "code=" in location
        )
