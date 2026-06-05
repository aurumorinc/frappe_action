import json
import frappe
from frappe import _

@frappe.whitelist()
def get_open():
    user = frappe.session.user
    
    # Find the oldest open ToDo assigned to the user that has an Action
    todos = frappe.get_all(
        "ToDo",
        filters={
            "allocated_to": user,
            "status": "Open",
            "action": ["is", "set"]
        },
        order_by="creation asc",
        limit=1
    )
    
    if todos:
        todo = frappe.get_doc("ToDo", todos[0].name)
        return todo.as_dict()
            
    return None

@frappe.whitelist()
def submit(doc):
    if isinstance(doc, str):
        doc = json.loads(doc)
        
    todo = frappe.get_doc("ToDo", doc.get("name"))
    
    # Ensure user has permission
    if todo.allocated_to != frappe.session.user and frappe.session.user != "Administrator":
        frappe.throw(_("Not permitted"), frappe.PermissionError)
        
    todo.update(doc)
    todo.save(ignore_permissions=True)
    
    return todo.as_dict()

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
