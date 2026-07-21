import json
import frappe
from frappe import _

@frappe.whitelist()
def get_open(limit=9):
    user = frappe.session.user
    
    # Fetch up to `limit` open ToDos (ordered by priority desc, creation asc) where `main` is null or empty
    open_todos = frappe.get_all(
        "ToDo",
        filters={
            "allocated_to": user,
            "status": "Open",
            "main": ["in", ["", None]],
            "action": ["is", "set"]
        },
        fields=["*"],
        order_by="priority desc, creation asc",
        limit=limit
    )
    
    # Fetch 1 most recently closed ToDo where `main` is null or empty
    recent_closed = frappe.get_all(
        "ToDo",
        filters={
            "allocated_to": user,
            "status": ["in", ["Closed", "Cancelled"]],
            "main": ["in", ["", None]],
            "action": ["is", "set"]
        },
        fields=["*"],
        order_by="modified desc",
        limit=1
    )
    
    return {
        "open_todos": open_todos,
        "recent_closed": recent_closed
    }

@frappe.whitelist()
def get_report():
    user = frappe.session.user
    
    # Calculate total_open: Count of all open ToDos assigned to the user
    total_open = frappe.db.count(
        "ToDo",
        filters={
            "allocated_to": user,
            "status": "Open"
        }
    )
    
    # Calculate completed_today: Count of all closed/cancelled ToDos assigned to the user, modified today
    today = frappe.utils.nowdate()
    completed_today = frappe.db.count(
        "ToDo",
        filters={
            "allocated_to": user,
            "status": ["in", ["Closed", "Cancelled"]],
            "modified": [">=", today]
        }
    )
    
    return {
        "total_open": total_open,
        "completed_today": completed_today
    }

@frappe.whitelist()
def get_sub(parent_id):
    user = frappe.session.user
    
    # Fetch all ToDos where `main` equals `parent_id`
    sub_todos = frappe.get_all(
        "ToDo",
        filters={
            "allocated_to": user,
            "main": parent_id
        },
        fields=["*"],
        order_by="priority desc, creation asc"
    )
    
    return sub_todos

@frappe.whitelist()
def save(doc):
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
    
    if parent_todo.allocated_to != frappe.session.user and frappe.session.user != "Administrator":
        frappe.throw(_("You do not have permission to modify this ToDo. It is allocated to another user."), frappe.PermissionError)
    
    if not frappe.db.exists("Action", action_name):
        frappe.throw(_("The requested action '{0}' could not be found.").format(action_name))
        
    new_todo = frappe.get_doc({
        "doctype": "ToDo",
        "allocated_to": frappe.session.user,
        "action": action_name,
        "reference_type": parent_todo.reference_type,
        "reference_name": parent_todo.reference_name,
        "description": _("Sub-todo of {0}").format(parent_todo_id),
        "main": parent_todo_id
    })
    
    new_todo.insert(ignore_permissions=True)
    
    return {"status": "success", "todo_id": new_todo.name}

