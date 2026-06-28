import frappe
from frappe.integrations.oauth2 import authorize as frappe_authorize
from frappe_action.action.doctype.action_settings.action_settings import get_or_create_oauth_client

@frappe.whitelist(allow_guest=True)
def authorize(**kwargs):
    client_id = kwargs.get("client_id")
    redirect_uri = kwargs.get("redirect_uri")
    
    if client_id and redirect_uri:
        # Check if this is the Action client
        client_name = frappe.db.get_value("OAuth Client", {"client_id": client_id}, "app_name")
        if client_name == "Action":
            # Ensure the redirect_uri is in the client's allowed list
            get_or_create_oauth_client(redirect_uri=redirect_uri)
            
    # Call the original authorize method
    return frappe_authorize(**kwargs)

def get_permission_query_conditions(user):
    if not user:
        user = frappe.session.user
        
    if user == "Administrator":
        return ""
        
    return "`tabOAuth Client`.app_name != 'Action'"

def has_permission(doc, user):
    if not user:
        user = frappe.session.user
        
    if user == "Administrator":
        return True
        
    if doc.app_name == "Action":
        return False
        
    return True
