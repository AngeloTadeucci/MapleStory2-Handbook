export interface Map {
  id: number;
  name: string;
  visit_count: number;
  icon: string;
  minimap: string;
  bg: string;

  // Enhanced fields
  description?: string | null;
  xblock_name?: string | null;
  recommended_level?: number | null;
  drop_rank?: number | null;
  max_capacity?: number | null;
  death_penalty?: number | null; // 0/1 boolean
  flight_enabled?: number | null; // 0/1 boolean
  climb_enabled?: number | null; // 0/1 boolean
  home_returnable?: number | null; // 0/1 boolean
  is_tutorial_map?: number | null; // 0/1 boolean
  revival_return_map_id?: number | null;
  enter_return_map_id?: number | null;
  minimap_width?: number | null;
  minimap_height?: number | null;
  bounding_box_min_x?: number | null;
  bounding_box_min_y?: number | null;
  bounding_box_min_z?: number | null;
  bounding_box_max_x?: number | null;
  bounding_box_max_y?: number | null;
  bounding_box_max_z?: number | null;
  block_metadata?: any | null; // JSON field
}

export type SearchMap = Pick<Map, 'id' | 'name' | 'icon'>;

// Junction table types
export interface MapNpc {
  uid: number;
  map_id: number;
  npc_id: number;
  coord_x?: number | null;
  coord_y?: number | null;
  coord_z?: number | null;
  rotation_x?: number | null;
  rotation_y?: number | null;
  rotation_z?: number | null;
  model_name?: string | null;
  instance_name?: string | null;
  is_spawn_on_field_create?: number | null;
  is_day_die?: number | null;
  is_night_die?: number | null;
  patrol_data_uuid?: string | null;

  // Joined NPC data
  npc_name?: string;
  portrait?: string | null;
  npc_type?: number | null;
  is_boss?: number | null;
}

export interface MapMob {
  uid: number;
  map_id: number;
  spawn_point_id: number;
  npc_id: number;
  coord_x: number;
  coord_y: number;
  coord_z: number;
  rotation_x: number;
  rotation_y: number;
  rotation_z: number;
  min_difficulty?: number | null;
  max_difficulty?: number | null;
  population?: number | null;
  cooldown?: number | null;
  pet_population?: number | null;
  pet_spawn_rate?: number | null;

  // Joined NPC data
  npc_name?: string;
  portrait?: string | null;
  npc_type?: number | null;
  is_boss?: number | null;
  level?: number | null;
}

export interface MapPortal {
  uid: number;
  map_id: number;
  portal_id: number;
  name?: string | null;
  destination_map_id: number;
  target_portal_id: number;
  coord_x?: number | null;
  coord_y?: number | null;
  coord_z?: number | null;
  rotation_x?: number | null;
  rotation_y?: number | null;
  rotation_z?: number | null;
  portal_type?: number | null;
  is_enabled?: number | null;
  is_visible?: number | null;
  minimap_visible?: number | null;
  trigger_id?: number | null;

  // Joined map data
  destination_name?: string;
}

export interface QuestMap {
  uid: number;
  quest_id: number;
  map_id: number;

  // Joined quest data
  quest_name?: string;
  quest_level?: number | null;
  required_level?: number | null;
}
