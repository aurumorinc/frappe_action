import frappe
from frappe.model.document import Document

class ActionSettings(Document):
    pass

@frappe.whitelist()
def get_or_create_oauth_client(redirect_uri=None):
    frappe.log_error(f"get_or_create_oauth_client called with redirect_uri: {redirect_uri}", "OAuth Debug")
    client_name = "Action"
    
    # Check if client already exists
    client_id = frappe.db.get_value("OAuth Client", {"app_name": client_name}, "client_id")
    
    if not client_id:
        # Create new OAuth Client
        doc = frappe.get_doc({
            "doctype": "OAuth Client",
            "app_name": client_name,
            "skip_authorization": 1,
            "scopes": "all",
            "redirect_uris": redirect_uri or "https://*.chromiumapp.org/",
            "default_redirect_uri": redirect_uri or "https://*.chromiumapp.org/",
            "grant_type": "Authorization Code",
            "response_type": "Code"
        })
        doc.insert(ignore_permissions=True)
        client_id = doc.client_id
    elif redirect_uri:
        # Update existing client with new redirect_uri if not present
        doc = frappe.get_doc("OAuth Client", client_id)
        # Frappe's oauthlib integration splits redirect_uris by space, not newline.
        uris = doc.redirect_uris.replace("\n", " ").split(" ") if doc.redirect_uris else []
        
        # Deduplicate and preserve order
        seen = set()
        unique_uris = []
        for u in uris:
            u = u.strip()
            if u and u not in seen:
                seen.add(u)
                unique_uris.append(u)
                
        needs_save = False
        if redirect_uri not in unique_uris:
            unique_uris.append(redirect_uri)
            doc.default_redirect_uri = redirect_uri
            needs_save = True
            
        new_redirect_uris = " ".join(unique_uris)
        if doc.redirect_uris != new_redirect_uris:
            doc.redirect_uris = new_redirect_uris
            needs_save = True
            
        if needs_save:
            doc.save(ignore_permissions=True)
            frappe.db.commit()
        
    return client_id

@frappe.whitelist()
def get_authorization_status():
    client_name = "Action"
    client_id = frappe.db.get_value("OAuth Client", {"app_name": client_name}, "client_id")
    if not client_id:
        return False
    
    # Check if there is a valid token for the current user
    token = frappe.db.get_value("OAuth Bearer Token", {
        "client": client_id,
        "user": frappe.session.user
    }, "name")
    
    return bool(token)

@frappe.whitelist()
def deauthorize():
    client_name = "Action"
    client_id = frappe.db.get_value("OAuth Client", {"app_name": client_name}, "client_id")
    if not client_id:
        return False
    
    tokens = frappe.get_all("OAuth Bearer Token", filters={
        "client": client_id,
        "user": frappe.session.user
    })
    
    for token in tokens:
        frappe.delete_doc("OAuth Bearer Token", token.name, ignore_permissions=True)
        
    return True
