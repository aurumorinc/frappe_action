import frappe
from frappe.model.document import Document

class OrbitSettings(Document):
    pass

@frappe.whitelist()
def get_or_create_oauth_client():
    client_name = "Frappe Orbit Extension"
    
    # Check if client already exists
    client_id = frappe.db.get_value("OAuth Client", {"app_name": client_name}, "client_id")
    
    if not client_id:
        # Create new OAuth Client
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
        client_id = doc.client_id
        
    return client_id
