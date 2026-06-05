import frappe
from frappe.integrations.oauth2 import authorize as frappe_authorize
from frappe_orbit.orbit.doctype.orbit_settings.orbit_settings import get_or_create_oauth_client

@frappe.whitelist(allow_guest=True)
def authorize(**kwargs):
    client_id = kwargs.get("client_id")
    redirect_uri = kwargs.get("redirect_uri")
    
    if client_id and redirect_uri:
        # Check if this is the Orbit client
        client_name = frappe.db.get_value("OAuth Client", {"client_id": client_id}, "app_name")
        if client_name == "Orbit":
            # Ensure the redirect_uri is in the client's allowed list
            get_or_create_oauth_client(redirect_uri=redirect_uri)
            
    # Call the original authorize method
    return frappe_authorize(**kwargs)

def get_permission_query_conditions(user):
    if not user:
        user = frappe.session.user
        
    if user == "Administrator":
        return ""
        
    return "`tabOAuth Client`.app_name != 'Orbit'"

def has_permission(doc, user):
    if not user:
        user = frappe.session.user
        
    if user == "Administrator":
        return True
        
    if doc.app_name == "Orbit":
        return False
        
    return True
