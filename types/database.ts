export type Profile = {
  id: string;
  display_name: string;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
};

export type Space = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SpaceMember = {
  space_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
};

export type Invitation = {
  id: string;
  space_id: string;
  invited_by: string;
  token_hash: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};


export type Task = {
  id: string;
  space_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: 'Low' | 'Medium' | 'High';
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};


export type Memory = {
  id: string;
  space_id: string;
  caption: string | null;
  memory_date: string;
  category: 'Everyday' | 'Travel' | 'Celebration' | 'Food' | 'Milestone' | 'Other';
  storage_path: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};


export type Notification = {
  id: string;
  space_id: string;
  recipient_id: string;
  actor_id: string | null;
  event_type: 'task_created' | 'task_completed' | 'task_reopened' | 'shopping_item_added' | 'shopping_item_purchased' | 'meal_added' | 'memory_added';
  title: string;
  body: string;
  entity_type: 'task' | 'shopping' | 'meal' | 'memory';
  entity_id: string;
  read_at: string | null;
  created_at: string;
};
