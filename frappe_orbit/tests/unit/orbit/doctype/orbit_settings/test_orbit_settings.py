import frappe
from frappe.tests import UnitTestCase
from frappe_orbit.orbit.doctype.orbit_settings.orbit_settings import get_or_create_oauth_client

class TestOrbitSettings(UnitTestCase):
    def test_get_or_create_oauth_client_creates_new_client(self):
        # Ensure the client doesn't exist before the test
        client_name = "Frappe Orbit Extension"
        if frappe.db.exists("OAuth Client", {"app_name": client_name}):
            frappe.delete_doc("OAuth Client", frappe.db.get_value("OAuth Client", {"app_name": client_name}, "name"), ignore_permissions=True)
            
        client_id = get_or_create_oauth_client()
        
        self.assertIsNotNone(client_id)
        
        # Verify the client was created with correct settings
        client = frappe.get_doc("OAuth Client", {"app_name": client_name})
        self.assertEqual(client.skip_authorization, 1)
        self.assertEqual(client.scopes, "all")
        self.assertEqual(client.redirect_uris, "https://*.chromiumapp.org/")
        self.assertEqual(client.default_redirect_uri, "https://*.chromiumapp.org/")
        self.assertEqual(client.grant_type, "Authorization Code")
        self.assertEqual(client.response_type, "Code")

    def test_get_or_create_oauth_client_returns_existing_client(self):
        # Create a client first
        client_name = "Frappe Orbit Extension"
        if not frappe.db.exists("OAuth Client", {"app_name": client_name}):
            doc = frappe.get_doc({
                "doctype": "OAuth Client",
                "app_name": client_name,
                "skip_authorization": 1,
                "scopes": "all",
                "redirect_uris": "https://*.chromiumapp.org/",
                "default_redirect_uri": "https://*.chromiumapp.org/",
                "grant_type": "Authorization Code",
                "response_type": "Code"
            })
            doc.insert(ignore_permissions=True)
            existing_client_id = doc.client_id
        else:
            existing_client_id = frappe.db.get_value("OAuth Client", {"app_name": client_name}, "client_id")
            
        # Call the method
        client_id = get_or_create_oauth_client()
        
        # Verify it returns the existing client ID
        self.assertEqual(client_id, existing_client_id)
