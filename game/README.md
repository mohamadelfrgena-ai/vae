# لعبة ناشا (Godot 4)

## التثبيت
### الطريقة الأسهل (ويندوز 10/11): سكربت التثبيت
افتح PowerShell داخل مجلد `game` (الذي فيه `project.godot`) ونفّذ:
```
powershell -ExecutionPolicy Bypass -File .\tools\install_windows.ps1
```
يثبّت Godot 4 تلقائياً، ويسألك عن الأدوات الاختيارية (Krita وAudacity وVS Code).

### الطريقة اليدوية
1. حمّل **Godot 4.7.2 Stable** من الموقع الرسمي: https://godotengine.org/download/windows/
   (اختر نسخة Standard، وليست .NET/Mono إلا إذا احتجتها).
2. شغّل Godot ثم اضغط **Import** واختر الملف `game/project.godot`.
3. اضغط **F5** (أو زر Play) لتشغيل اللعبة.

## الأدوات الاختيارية
- **Krita**: رسم الشخصيات والتعابير. https://krita.org/en/download/
- **Audacity**: مؤثرات الصوت. https://www.audacityteam.org/download/
- **VS Code**: تحرير السكربتات عند الحاجة. https://code.visualstudio.com/

## الهيكل
- `scenes/` مشاهد اللعبة (المراحل، الشخصيات، القوائم)
- `scripts/` سكربتات GDScript (الحركة، القتال، ...)
- `project.godot` إعدادات المشروع

## الحالة الحالية
- حركة أساسية: يمين/يسار وقفز (A/D أو الأسهم، Space أو W).
- مرحلة تجريبية بسيطة (`scenes/main.tscn`).
