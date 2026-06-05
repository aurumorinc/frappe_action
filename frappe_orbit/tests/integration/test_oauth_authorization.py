import frappe
from frappe.tests import IntegrationTestCase
from frappe_orbit.orbit.doctype.orbit_settings.orbit_settings import get_or_create_oauth_client

class TestOAuthAuthorization(IntegrationTestCase):
    def tearDown(self):
        # Clean up OAuth Client
        client_name = "Frappe Orbit Extension"
        client_id = frappe.db.get_value("OAuth Client", {"app_name": client_name}, "name")
        if client_id:
            frappe.delete_doc("OAuth Client", client_id, ignore_permissions=True, force=True)
        
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
        self.assertIn("/api/method/frappe.integrations.oauth2.approve", frappe.local.response.get("location", ""))
