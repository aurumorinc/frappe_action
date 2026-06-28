import frappe
from frappe.tests import UnitTestCase
from frappe_action.action.doctype.action_settings.action_settings import get_or_create_oauth_client, get_authorization_status, deauthorize

class TestActionSettings(UnitTestCase):
    def tearDown(self):
        # Clean up OAuth Client
        client_name = "Action"
        client_id = frappe.db.get_value("OAuth Client", {"app_name": client_name}, "name")
        if client_id:
            # Clean up associated tokens
            tokens = frappe.get_all("OAuth Bearer Token", filters={"client": client_id})
            for token in tokens:
                frappe.delete_doc("OAuth Bearer Token", token.name, ignore_permissions=True, force=True)
            
            frappe.delete_doc("OAuth Client", client_id, ignore_permissions=True, force=True)
        
        frappe.db.commit()

    def test_get_or_create_oauth_client_creates_new_client(self):
        client_name = "Action"
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
        client_name = "Action"
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
            
        # Call the method
        client_id = get_or_create_oauth_client()
        
        # Verify it returns the existing client ID
        self.assertEqual(client_id, existing_client_id)

    def test_get_or_create_oauth_client_updates_redirect_uri(self):
        client_id = get_or_create_oauth_client()
        
        new_uri = "https://test.chromiumapp.org/"
        get_or_create_oauth_client(redirect_uri=new_uri)
        
        doc = frappe.get_doc("OAuth Client", client_id)
        self.assertIn(new_uri, doc.redirect_uris)
        self.assertNotIn("\n", doc.redirect_uris)
        self.assertIn(" ", doc.redirect_uris)
        self.assertEqual(doc.default_redirect_uri, new_uri)

    def test_get_or_create_oauth_client_with_custom_redirect_uri(self):
        custom_uri = "https://custom.app.com/"
        client_id = get_or_create_oauth_client(redirect_uri=custom_uri)
        
        doc = frappe.get_doc("OAuth Client", client_id)
        self.assertEqual(doc.redirect_uris, custom_uri)
        self.assertEqual(doc.default_redirect_uri, custom_uri)

    def test_get_or_create_oauth_client_does_not_duplicate_existing_uri(self):
        existing_uri = "https://existing.com/"
        client_id = get_or_create_oauth_client(redirect_uri=existing_uri)
        
        # Call again with the same URI
        get_or_create_oauth_client(redirect_uri=existing_uri)
        
        doc = frappe.get_doc("OAuth Client", client_id)
        self.assertEqual(doc.redirect_uris, existing_uri)
        self.assertEqual(doc.redirect_uris.count(existing_uri), 1)

    def test_get_or_create_oauth_client_handles_multiple_updates(self):
        client_id = get_or_create_oauth_client(redirect_uri="https://uri1.com/")
        get_or_create_oauth_client(redirect_uri="https://uri2.com/")
        get_or_create_oauth_client(redirect_uri="https://uri3.com/")
        
        doc = frappe.get_doc("OAuth Client", client_id)
        self.assertIn("https://uri1.com/", doc.redirect_uris)
        self.assertIn("https://uri2.com/", doc.redirect_uris)
        self.assertIn("https://uri3.com/", doc.redirect_uris)
        self.assertEqual(doc.default_redirect_uri, "https://uri3.com/")
        self.assertNotIn("\n", doc.redirect_uris)

    def test_get_or_create_oauth_client_migrates_existing_newlines(self):
        # Create a client with newlines
        client_name = "Action"
        doc = frappe.get_doc({
            "doctype": "OAuth Client",
            "app_name": client_name,
            "skip_authorization": 1,
            "scopes": "all",
            "redirect_uris": "https://*.chromiumapp.org/\nhttps://target.chromiumapp.org/",
            "default_redirect_uri": "https://*.chromiumapp.org/",
            "grant_type": "Authorization Code",
            "response_type": "Code"
        })
        doc.insert(ignore_permissions=True)
        client_id = doc.client_id
        
        # Call with the target URI that is already in the list but separated by newline
        get_or_create_oauth_client(redirect_uri="https://target.chromiumapp.org/")
        
        doc = frappe.get_doc("OAuth Client", client_id)
        self.assertNotIn("\n", doc.redirect_uris)
        self.assertIn(" ", doc.redirect_uris)
        self.assertEqual(doc.redirect_uris, "https://*.chromiumapp.org/ https://target.chromiumapp.org/")

    def test_get_or_create_oauth_client_handles_mixed_delimiters(self):
        client_name = "Action"
        doc = frappe.get_doc({
            "doctype": "OAuth Client",
            "app_name": client_name,
            "skip_authorization": 1,
            "scopes": "all",
            "redirect_uris": "uri1\nuri2 uri3",
            "default_redirect_uri": "uri1",
            "grant_type": "Authorization Code",
            "response_type": "Code"
        })
        doc.insert(ignore_permissions=True)
        client_id = doc.client_id
        
        get_or_create_oauth_client(redirect_uri="uri4")
        
        doc = frappe.get_doc("OAuth Client", client_id)
        self.assertNotIn("\n", doc.redirect_uris)
        self.assertEqual(doc.redirect_uris, "uri1 uri2 uri3 uri4")

    def test_get_or_create_oauth_client_handles_duplicate_uris_with_newlines(self):
        client_name = "Action"
        doc = frappe.get_doc({
            "doctype": "OAuth Client",
            "app_name": client_name,
            "skip_authorization": 1,
            "scopes": "all",
            "redirect_uris": "uri1\nuri1\nuri2",
            "default_redirect_uri": "uri1",
            "grant_type": "Authorization Code",
            "response_type": "Code"
        })
        doc.insert(ignore_permissions=True)
        client_id = doc.client_id
        
        get_or_create_oauth_client(redirect_uri="uri1")
        
        doc = frappe.get_doc("OAuth Client", client_id)
        self.assertNotIn("\n", doc.redirect_uris)
        self.assertEqual(doc.redirect_uris, "uri1 uri2")

    def test_custom_authorize_adds_redirect_uri(self):
        from frappe_action.integrations.oauth2 import authorize
        
        # Setup: Create client with default wildcard URI
        client_id = get_or_create_oauth_client()
        
        # Act: Call authorize with a specific redirect_uri
        specific_uri = "https://specific.chromiumapp.org/"
        
        # We need to mock frappe.request and frappe.local.response because authorize() uses them
        import werkzeug.test
        from werkzeug.wrappers import Request
        
        builder = werkzeug.test.EnvironBuilder(
            method='GET',
            path='/api/method/frappe.integrations.oauth2.authorize',
            query_string={
                'client_id': client_id,
                'response_type': 'code',
                'redirect_uri': specific_uri,
                'scope': 'all'
            }
        )
        env = builder.get_environ()
        frappe.local.request = Request(env)
        frappe.local.response = frappe._dict()
        frappe.local.form_dict = frappe._dict({
            'client_id': client_id,
            'response_type': 'code',
            'redirect_uri': specific_uri,
            'scope': 'all'
        })
        
        # Call authorize
        authorize(
            client_id=client_id,
            response_type='code',
            redirect_uri=specific_uri,
            scope='all'
        )
        
        # Assert: The specific_uri should be added to the client's redirect_uris
        updated_doc = frappe.get_doc("OAuth Client", client_id)
        self.assertIn(specific_uri, updated_doc.redirect_uris.split(" "))

    def test_authorization_status_no_token(self):
        self.assertFalse(get_authorization_status())

    def test_authorization_status_with_token(self):
        client_id = get_or_create_oauth_client()
        
        # Create a dummy token
        doc = frappe.get_doc({
            "doctype": "OAuth Bearer Token",
            "client": client_id,
            "user": frappe.session.user,
            "scopes": "all",
            "access_token": "dummy_token",
            "refresh_token": "dummy_refresh",
            "expires_in": 3600
        })
        doc.insert(ignore_permissions=True)

        self.assertTrue(get_authorization_status())

    def test_deauthorize_removes_multiple_tokens(self):
        client_id = get_or_create_oauth_client()
        
        # Create multiple dummy tokens
        for i in range(3):
            doc = frappe.get_doc({
                "doctype": "OAuth Bearer Token",
                "client": client_id,
                "user": frappe.session.user,
                "scopes": "all",
                "access_token": f"dummy_token_{i}",
                "refresh_token": f"dummy_refresh_{i}",
                "expires_in": 3600
            })
            doc.insert(ignore_permissions=True)

        self.assertTrue(get_authorization_status())
        
        # Deauthorize
        result = deauthorize()
        self.assertTrue(result)
        self.assertFalse(get_authorization_status())
        
        # Verify tokens are deleted
        tokens = frappe.get_all("OAuth Bearer Token", filters={"client": client_id, "user": frappe.session.user})
        self.assertEqual(len(tokens), 0)

    def test_get_authorization_status_without_client(self):
        # Ensure no client exists
        self.assertFalse(get_authorization_status())

    def test_deauthorize_without_client(self):
        # Ensure no client exists
        self.assertFalse(deauthorize())

    def test_after_install_creates_client(self):
        from frappe_action.install import after_install
        
        # Ensure no client exists
        client_name = "Action"
        frappe.db.delete("OAuth Client", {"app_name": client_name})
        
        after_install()
        
        client_id = frappe.db.get_value("OAuth Client", {"app_name": client_name}, "name")
        self.assertIsNotNone(client_id)

    def test_before_uninstall_deletes_client_and_tokens(self):
        from frappe_action.uninstall import before_uninstall
        
        client_id = get_or_create_oauth_client()
        
        # Create a dummy token
        doc = frappe.get_doc({
            "doctype": "OAuth Bearer Token",
            "client": client_id,
            "user": frappe.session.user,
            "scopes": "all",
            "access_token": "dummy_token_uninstall",
            "refresh_token": "dummy_refresh_uninstall",
            "expires_in": 3600
        })
        doc.insert(ignore_permissions=True)
        
        before_uninstall()
        
        # Verify client is deleted
        client_exists = frappe.db.exists("OAuth Client", {"app_name": "Action"})
        self.assertFalse(client_exists)
        
        # Verify tokens are deleted
        tokens = frappe.get_all("OAuth Bearer Token", filters={"client": client_id})
        self.assertEqual(len(tokens), 0)

    def test_get_permission_query_conditions(self):
        from frappe_action.integrations.oauth2 import get_permission_query_conditions
        
        # Administrator should see everything
        self.assertEqual(get_permission_query_conditions("Administrator"), "")
        
        # Other users should not see Action
        self.assertEqual(get_permission_query_conditions("test@example.com"), "`tabOAuth Client`.app_name != 'Action'")

    def test_has_permission(self):
        from frappe_action.integrations.oauth2 import has_permission
        
        client_id = get_or_create_oauth_client()
        doc = frappe.get_doc("OAuth Client", client_id)
        
        # Administrator should have permission
        self.assertTrue(has_permission(doc, "Administrator"))
        
        # Other users should not have permission
        self.assertFalse(has_permission(doc, "test@example.com"))
        
        # Other clients should be accessible
        other_doc = frappe.get_doc({
            "doctype": "OAuth Client",
            "app_name": "Other Client",
            "skip_authorization": 1,
            "scopes": "all",
            "redirect_uris": "https://example.com",
            "default_redirect_uri": "https://example.com",
            "grant_type": "Authorization Code",
            "response_type": "Code"
        })
        other_doc.insert(ignore_permissions=True)
        
        self.assertTrue(has_permission(other_doc, "test@example.com"))
        
        # Cleanup
        frappe.delete_doc("OAuth Client", other_doc.name, ignore_permissions=True, force=True)
