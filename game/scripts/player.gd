extends CharacterBody2D
## حركة اللاعب الأساسية: يمين/يسار وقفز.
## الأزرار: A/D أو الأسهم للحركة، Space أو W للقفز.

const SPEED := 300.0
const JUMP_VELOCITY := -600.0
const GRAVITY := 1500.0


func _ready() -> void:
	_setup_input()


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y += GRAVITY * delta

	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	var direction := Input.get_axis("move_left", "move_right")
	velocity.x = direction * SPEED

	move_and_slide()


## ينشئ أزرار الحركة برمجياً حتى لا نحتاج إعداد Input Map يدوياً في المحرر.
func _setup_input() -> void:
	_add_action("move_left", [KEY_A, KEY_LEFT])
	_add_action("move_right", [KEY_D, KEY_RIGHT])
	_add_action("jump", [KEY_SPACE, KEY_W])


func _add_action(action: StringName, keys: Array) -> void:
	if InputMap.has_action(action):
		return
	InputMap.add_action(action)
	for key in keys:
		var event := InputEventKey.new()
		event.physical_keycode = key
		InputMap.action_add_event(action, event)
