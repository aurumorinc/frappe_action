import json
import frappe
from frappe import _

@frappe.whitelist()
def get_active():
    user = frappe.session.user
    
    # Find the oldest open ToDo assigned to the user that has an Action
    todos = frappe.get_all(
        "ToDo",
        filters={
            "allocated_to": user,
            "status": "Open",
            "action": ["is", "set"]
        },
        fields=["name", "action", "reference_type", "reference_name"],
        order_by="creation asc"
    )
    
    for todo in todos:
        action = frappe.get_doc("Action", todo.action)
        
        # Render target_url with Jinja
        target_url = action.target_url
        if target_url:
            target_url = frappe.render_template(target_url, {"doc": todo})
            
        # Translate compiled_json
        compiled_json = action.compiled_json
        if compiled_json:
            compiled_data = json.loads(compiled_json)
            # Basic translation of text fields if needed, though usually handled on frontend
            # For now, we just return the JSON
            
            return {
                "todo_id": todo.name,
                "action_name": action.action_name,
                "target_url": target_url,
                "compiled_json": compiled_data
            }
            
    return None

@frappe.whitelist()
def get_action_by_name(action_name):
    if not frappe.db.exists("Action", action_name):
        frappe.throw(_("Action {0} not found").format(action_name))
        
    action = frappe.get_doc("Action", action_name)
    
    compiled_json = action.compiled_json
    compiled_data = json.loads(compiled_json) if compiled_json else {}
    
    return {
        "action_name": action.action_name,
        "target_url": action.target_url,
        "compiled_json": compiled_data
    }

@frappe.whitelist()
def submit_task_data(todo_id, scraped_data):
    if isinstance(scraped_data, str):
        scraped_data = json.loads(scraped_data)
        
    todo = frappe.get_doc("ToDo", todo_id)
    
    # Ensure user has permission
    if todo.allocated_to != frappe.session.user and frappe.session.user != "Administrator":
        frappe.throw(_("Not permitted"), frappe.PermissionError)
        
    todo.response_body = json.dumps(scraped_data)
    todo.status = "Closed"
    todo.save(ignore_permissions=True)
    
    return {"status": "success"}

@frappe.whitelist()
def trigger_sub(parent_todo_id, action_name, context_data=None):
    parent_todo = frappe.get_doc("ToDo", parent_todo_id)
    
    if not frappe.db.exists("Action", action_name):
        frappe.throw(_("Action {0} not found").format(action_name))
        
    new_todo = frappe.get_doc({
        "doctype": "ToDo",
        "allocated_to": frappe.session.user,
        "action": action_name,
        "reference_type": parent_todo.reference_type,
        "reference_name": parent_todo.reference_name,
        "description": _("Sub-todo of {0}").format(parent_todo_id),
        "depends_on": parent_todo_id
    })
    
    new_todo.insert(ignore_permissions=True)
    
    return {"status": "success", "todo_id": new_todo.name}
