/* ============================================================
   i18n.js — Arabic (default, RTL) + English UI strings
   ============================================================ */
export const DICT = {
  ar: {
    tagline: 'استوديو أنيميشن بلوكي في المتصفح',
    new: 'جديد', save: 'حفظ', open: 'فتح', export: 'تصدير ⤓',
    tabWorld: 'العالم', tabChar: 'الشخصية', tabMotion: 'حركات جاهزة',
    palette: 'لوحة البلوكات',
    modePlace: '🧱 بناء', modeErase: '🧽 حذف',
    buildHint: 'في وضع البناء: اضغط على الأرضية أو على وجه بلوك لإضافة بلوك. عجلة الفأرة للدوران، وزر أوسط للسحب.',
    worldStyle: 'طابع العالم', sceneActions: 'أدوات',
    addTree: '🌳 شجرة', addProps: '🏠 عناصر', clearBlocks: 'تفريغ الأرض', resetWorld: 'إعادة الملعب',
    modelType: 'نوع الموديل', classic: 'كلاسيكي', slim: 'نحيف',
    colors: 'الألوان', quickSkins: 'جلود جاهزة', rigTools: 'التحكم بالجسم',
    restPose: 'وضع الراحة', tpose: 'وضع T', mirror: 'عكس',
    presets: 'حركات جاهزة', presetHint: 'اختيار حركة يكتب الكي فريمات على التايم لاين — تقدر تعدلها بعدها بحرية.',
    clearAnim: 'حذف كل الأنيميشن',
    vFront: 'أمامي', vSide: 'جانبي', vTop: 'علوي', vIso: '٣د', vFace: 'بورتريه',
    camKey: 'كي كاميرا', camAnim: 'كاميرا متحركة',
    fps: 'إطارات/ث', length: 'المدة', autoKey: 'تسجيل تلقائي ♦', snapshot: '📸 لقطة',
    bone: 'العظمة المحددة', keyPose: '♦ كي الآن', resetBone: 'تصفير',
    selectedKey: 'الكي المحدد', noKey: 'لا يوجد كي محدد',
    prevKey: '◀ السابق', nextKey: 'التالي ▶', delKey: 'حذف الكي',
    shortcuts: 'اختصارات', scPlay: 'تشغيل/إيقاف', scStep: 'فريم للأمام/الخلف',
    scKey: 'إضافة كي للعظمة', scDel: 'حذف الكي المحدد', scSave: 'حفظ المشروع',
    ease: 'نعومة', easeSmooth: 'ناعم', easeLinear: 'خطي', easeStep: 'ثابت',
    exportTitle: 'تصدير', expVideo: '🎬 فيديو WebM', expFrames: '🖼 صور PNG (ZIP)', expJson: '📄 ملف المشروع',
    quality: 'الدقة', expFps: 'إطارات التصدير', expSrc: 'حجم النافذة',
    videoHint: 'التسجيل يتم لحظياً (ريل-تايم) من المتصفح مباشرة — خلّي التاب مفتوح أثناء التصدير.',
    framesHint: 'كل إطار في الأنيميشن يُصدَّر كصورة PNG داخل ملف ZIP واحد — ممتاز لو تحب تركّبها في برنامج مونتاج.',
    cancel: 'إلغاء', start: 'ابدأ التصدير', helpTitle: 'كيف تستخدم الاستوديو؟', ok: 'تمام',
    /* dynamic */
    camOrbitSection: 'حركات الكاميرا', skinColors: {
      skin: 'اللون الأساسي', hair: 'الشعر', shirt: 'القميص', pants: 'البنطال',
      shoes: 'الحذاء', eyes: 'العين', belt: 'الحزام',
    },
    pattern: 'نمط القميص', patterns: { plain: 'سادة', stripes: 'مخطط', creeper: 'كريبر', hoodie: 'هودي' },
    cape: '🦸 عباءة', band: '🎀 عصابة رأس', beard: '🧔 لحية',
    importSkin: '📥 استيراد جلد PNG', downloadSkin: '⬇ تنزيل الجلد',
    worldNames: {
      plains: 'سهول', hills: 'تلال', desert: 'صحراء', snow: 'ثلج',
      nether: 'نذر', studio: 'استوديو', void: 'فراغ', islands: 'جزر عائمة',
    },
    skinPresets: {
      steve: 'ستيف', alex: 'أليكس', ninja: 'نينجا', knight: 'فارس',
      creeper: 'كريبر', zombie: 'زومبي', robot: 'روبوت', king: 'ملك',
    },
    toastPlaced: 'تمت الإضافة', toastErased: 'تم الحذف',
    toastSaved: 'تم حفظ المشروع 💾', toastLoaded: 'تم فتح المشروع ✅',
    toastSkin: 'تم تطبيق الجلد 🧑‍🎨', toastKey: 'كي جديد ♦',
    toastDelKey: 'تم حذف الكي', toastNoKey: 'لا يوجد كي عند هذا الفريم',
    toastPreset: 'تمت إضافة الحركة، اضغط مسافة للتشغيل ▶',
    toastCamPreset: 'تم إنشاء حركة الكاميرا 🎥',
    toastUndo: 'تم التراجع',
    toastNew: 'مشروع جديد جاهز', toastCleared: 'تم تفريغ الأرض',
    toastImported: 'تم استيراد الجلد',
    exportDone: 'تم التصدير ✅', exportCancel: 'تم إلغاء التصدير',
    exportVideoFail: 'تعذّر تسجيل الفيديو في هذا المتصفح، جرّب تصدير الصور.',
    help: [
      '<b>حرّك المشهد:</b> اسحب بالماوس للدوران حول الشخصية، وعجلة الفأرة للتقريب، والزر الأوسط للتحريك.',
      '<b>اختر بلوك</b> من اللوحة واضغط على الأرض لبنائه، أو فعّل «حذف» واضغط على بلوك لإزالته.',
      '<b>حدّد عظمة</b> (الرأس، الذراع...) من القائمة اليمنى وحرّك المؤشرات — مع «تسجيل تلقائي» تُكتب الكي فريمات لوحدها.',
      '<b>جرّب حركة جاهزة</b> من تبويب «حركات جاهزة» ثم اضغط مسافة للتشغيل.',
      '<b>التايم لاين</b> أسفل الشاشة: المعيّنات الصفراء هي الكي فريمات، تكدر تسحبها بالماوس أو تحذفها.',
      '<b>الكاميرا:</b> وجّه الكاميرا كما تحب ثم اضغط «كي كاميرا» لتصوير اللقطة، وفعّل «كاميرا متحركة» لتشغيلها.',
      '<b>التصدير:</b> من زر «تصدير» — فيديو WebM، أو صور PNG لكل الإطارات داخل ZIP، أو ملف المشروع.',
      '<b>الجلود:</b> استورد أي ملف جلد PNG قياسي 64×64 وسيلبسه الشخصية فوراً.',
    ],
  },
  en: {
    tagline: 'Blocky animation studio in your browser',
    new: 'New', save: 'Save', open: 'Open', export: 'Export ⤓',
    tabWorld: 'World', tabChar: 'Character', tabMotion: 'Motions',
    palette: 'Block palette',
    modePlace: '🧱 Build', modeErase: '🧽 Erase',
    buildHint: 'In build mode click the ground or a block face to add a block. Drag to orbit, wheel to zoom.',
    worldStyle: 'World style', sceneActions: 'Tools',
    addTree: '🌳 Tree', addProps: '🏠 Props', clearBlocks: 'Clear ground', resetWorld: 'Reset playground',
    modelType: 'Model type', classic: 'Classic', slim: 'Slim',
    colors: 'Colours', quickSkins: 'Quick skins', rigTools: 'Body controls',
    restPose: 'Rest pose', tpose: 'T-pose', mirror: 'Mirror',
    presets: 'Motion presets', presetHint: 'Picking a motion writes keyframes on the timeline — edit them freely afterwards.',
    clearAnim: 'Clear all animation',
    vFront: 'Front', vSide: 'Side', vTop: 'Top', vIso: '3D', vFace: 'Portrait',
    camKey: 'Camera key', camAnim: 'Camera animation',
    fps: 'FPS', length: 'Length', autoKey: 'Auto-key ♦', snapshot: '📸 Snapshot',
    bone: 'Selected bone', keyPose: '♦ Key now', resetBone: 'Reset',
    selectedKey: 'Selected key', noKey: 'No key selected',
    prevKey: '◀ Prev', nextKey: 'Next ▶', delKey: 'Delete key',
    shortcuts: 'Shortcuts', scPlay: 'Play / pause', scStep: 'Step one frame',
    scKey: 'Key the selected bone', scDel: 'Delete selected key', scSave: 'Save project',
    ease: 'Ease', easeSmooth: 'Smooth', easeLinear: 'Linear', easeStep: 'Step',
    exportTitle: 'Export', expVideo: '🎬 WebM video', expFrames: '🖼 PNG frames (ZIP)', expJson: '📄 Project file',
    quality: 'Quality', expFps: 'Export FPS', expSrc: 'Window size',
    videoHint: 'Recording happens live in the browser — keep the tab open while it runs.',
    framesHint: 'Every frame is rendered as a PNG inside one ZIP — perfect for editing in your NLE.',
    cancel: 'Cancel', start: 'Start export', helpTitle: 'How to use the studio', ok: 'Got it',
    camOrbitSection: 'Camera moves',
    skinColors: {
      skin: 'Skin', hair: 'Hair', shirt: 'Shirt', pants: 'Pants',
      shoes: 'Shoes', eyes: 'Eyes', belt: 'Belt',
    },
    pattern: 'Shirt pattern', patterns: { plain: 'Plain', stripes: 'Stripes', creeper: 'Creeper', hoodie: 'Hoodie' },
    cape: '🦸 Cape', band: '🎀 Headband', beard: '🧔 Beard',
    importSkin: '📥 Import skin PNG', downloadSkin: '⬇ Download skin',
    worldNames: {
      plains: 'Plains', hills: 'Hills', desert: 'Desert', snow: 'Snow',
      nether: 'Nether', studio: 'Studio', void: 'Void', islands: 'Floating islands',
    },
    skinPresets: {
      steve: 'Steve', alex: 'Alex', ninja: 'Ninja', knight: 'Knight',
      creeper: 'Creeper', zombie: 'Zombie', robot: 'Robot', king: 'King',
    },
    toastPlaced: 'Block placed', toastErased: 'Block removed',
    toastSaved: 'Project saved 💾', toastLoaded: 'Project loaded ✅',
    toastSkin: 'Skin applied 🧑‍🎨', toastKey: 'New keyframe ♦',
    toastDelKey: 'Keyframe deleted', toastNoKey: 'No key on this frame',
    toastPreset: 'Motion added — hit space to play ▶',
    toastCamPreset: 'Camera move created 🎥',
    toastUndo: 'Undone',
    toastNew: 'Fresh project ready', toastCleared: 'Ground cleared',
    toastImported: 'Skin imported',
    exportDone: 'Export finished ✅', exportCancel: 'Export cancelled',
    exportVideoFail: 'Video recording is not supported here — try the PNG export.',
    help: [
      '<b>Move the scene:</b> drag to orbit, wheel to zoom, middle-drag to pan.',
      '<b>Pick a block</b> from the palette and click the ground to build, or switch to Erase and click a block to remove it.',
      '<b>Select a bone</b> (head, arm…) on the right and move the sliders — with Auto-key on, keyframes are written for you.',
      '<b>Try a motion preset</b> from the Motions tab, then press space to play.',
      '<b>Timeline</b> at the bottom: yellow diamonds are keyframes — drag or delete them.',
      '<b>Camera:</b> frame the shot, hit “Camera key”, then enable “Camera animation”.',
      '<b>Export:</b> WebM video, PNG frames in a ZIP, or the project file.',
      '<b>Skins:</b> import any standard 64×64 PNG skin and the character wears it instantly.',
    ],
  },
};

export function makeT(langRef) {
  return (key) => {
    const l = langRef();
    const parts = key.split('.');
    let v = DICT[l];
    for (const p of parts) v = v?.[p];
    if (v === undefined) {
      let w = DICT.ar;
      for (const p of parts) w = w?.[p];
      return w ?? key;
    }
    return v;
  };
}
