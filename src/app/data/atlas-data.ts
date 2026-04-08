/**
 * atlas-data.ts — Single source of truth for all Natural Fiber Atlas domain data.
 *
 * CONSUMER API: Import everything from this file only.
 * The internal data module (fibers.ts) is an implementation
 * detail and should not be imported directly by components, hooks,
 * or utilities.
 *
 * Exports:
 *   Types     — FiberProfile, FiberIndexEntry, GalleryImageEntry, PlateType,
 *               ProcessStep, AnatomyData, CareData, QuoteEntry
 *   Data      — fibers, fiberIndex, worldNames, namedPlates,
 *               processData, anatomyData, careData, quoteData
 *   Helpers   — getGalleryImages, getWorldNames, getFiberById
 */

/* ══════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════ */

import type { FiberProfile as FiberProfileBase, GalleryImageEntry } from "./fibers";
export type { GalleryImageEntry };

/**
 * Transitional compatibility shape for legacy consumers still reading
 * sustainability fields. Data-provider no longer persists this field.
 */
export interface FiberProfile extends FiberProfileBase {
  sustainability: {
    environmentalRating: 1 | 2 | 3 | 4 | 5;
    waterUsage: 1 | 2 | 3 | 4 | 5;
    carbonFootprint: 1 | 2 | 3 | 4 | 5;
    chemicalProcessing: 1 | 2 | 3 | 4 | 5;
    circularity: 1 | 2 | 3 | 4 | 5;
    biodegradable: boolean;
    recyclable: boolean;
    certifications: string[];
  };
}

export type PlateType =
  | "about"
  | "properties"
  | "insight1"
  | "insight2"
  | "insight3"
  | "silkCharmeuse"
  | "silkHabotai"
  | "silkDupioni"
  | "silkTaffeta"
  | "silkChiffon"
  | "silkOrganza"
  | "regions"
  | "trade"
  | "worldNames"
  | "seeAlso"
  | "quote"
  | "process"
  | "anatomy"
  | "care"
  | "contactSheet"
  | "youtubeEmbed";

/** Slim browse-mode entry — only the fields ProfileCard and grid search need. */
export interface FiberIndexEntry {
  id: string;
  name: string;
  image: string;
  status: "published" | "archived";
  category: "fiber" | "textile" | "dye" | "navigation-parent";
  /** Profile tags (e.g. Wool, Bast) — used for nav subcategory matching on the grid. */
  tags: string[];
  profilePills: {
    scientificName: string;
    plantPart: string;
    handFeel: string;
    fiberType: string;
    era: string;
    origin: string;
  };
}

/* ══════════════════════════════════════════════════════════
   Data — re-exported from internal modules
   ══════════════════════════════════════════════════════════ */

export { fibers, getFiberById } from "./fibers";
/* ═══ WORLD NAMES (merged from world-names.ts) ═══ */
export const worldNames: Record<string, string[]> = {
  hemp: ["Hemp", "大麻 (Dàmá)", "गांजा (Gāñjā)", "کنف (Kanaf)", "Cáñamo", "Hanf", "Chanvre", "Конопля (Konoplya)", "麻 (Asa)", "قنب (Qinn)", "Hennep", "Konopí", "Hampa", "Cânhamo", "アサ (Asa)", "Kanab"],
  jute: ["Jute", "পাট (Pāṭ)", "黄麻 (Huángmá)", "जूट (Jūṭ)", "جوت (Jut)", "ジュート (Jūto)", "황마 (Hwangma)", "Джут (Dzhut)", "Yute", "Jută", "Iuta", "کنف هندی (Kanaf-e Hendi)", "Chanvre", "Q'aytu"],
  "flax-linen": ["Flax / Linen", "亚麻 (Yàmá)", "अटसी (Aṭasī)", "کتان (Kattān)", "Lin", "Leinen", "Lino", "Лён (Lyon)", "リネン (Rinen)", "亞麻 (Amá)", "كتان (Kattān)", "Vlas", "Pellava", "Hør", "Lino", "Flax", "Q'aytu", "Fibra de Lino"],
  "organic-cotton": [
    "Organic Cotton",
    "棉花 (Miánhua)",
    "कार्पास (Kārpāsa)",
    "پنبه (Panbe)",
    "Coton Bio",
    "Bio-Baumwolle",
    "Algodón Orgánico",
    "Хлопок (Khlopok)",
    "綿 (Men)",
    "면 (Myeon)",
    "قطن (Quṭn)",
    "Algodão Orgânico",
    "Pamuk",
    "メン (Men)",
    "Utku",
    "Fibra de Algodón",
    "Βαμβάκι (Vamváki)",
    "Bawełna Organiczna",
    "bomull",
    "Coton Orgànic",
    "कापूस (Kāpūs)",
    "పంట (Patti)",
    "કપાસ (Kapās)",
    "Organik Pamuk",
    "कपास (Kapās)",
  ],
  silk: ["Silk", "丝绸 (Sīchóu)", "रेशम (Resham)", "ابریشم (Abrisham)", "Seda", "Soie", "Seide", "Шёлк (Shyolk)", "絹 (Kinu)", "حرير (Ḥarīr)", "비단 (Bidan)", "İpek", "Lụa", "ไหม (Mai)", "پارچه ابریشم (Parcha Abrisham)", "Silk", "キヌ (Kinu)", "Q'aytu"],
  charmeuse: ["Charmeuse", "Satin Silk", "Charmeuse Silk", "シルクシャルムーズ (Shiruku Sharumuzu)", "Шармез (Sharmez)", "Charmeuse de Soie", "Seda Charmeuse"],
  bamboo: ["Bamboo", "竹 (Zhú)", "वेणु (Veṇu)", "بامبو (Bāmbū)", "Bambu", "Bambou", "Бамбук (Bambuk)", "竹 (Take)", "대나무 (Daenamu)", "बाँस (Baans)", "Bambus", "چوب بامبو (Chub-e Bambu)", "Fibra de Bambú", "タケ (Take)", "Q'aytu"],
  wool: ["Wool", "羊毛 (Yángmáo)", "ऊर्णा (Ūrṇā)", "پشم (Pashm)", "Lana", "Laine", "Wolle", "Шерсть (Sherst)", "ウール (Ūru)", "صوف (Ṣūf)", "양모 (Yangmo)", "Ull", "Yün", "Lana", "Wool", "Millma", "Fibra de Lana"],
  coir: ["Coir", "椰壳纤维 (Yēké Xiānwéi)", "Fibre de Coco", "Kokosfaser", "Fibra de Coco", "Кокосовое волокно", "コイア (Koia)", "నారికేళం (Nārikēḷaṁ)", "नारियल रेशा (Nāriyal Reshā)", "پوست نارگیل (Pust-e Nargil)", "Coir", "ليف جوز الهند (Līf Jawz al-Hind)", "Q'aytu"],
  sisal: ["Sisal", "剑麻 (Jiànmá)", "サイザル (Saizaru)", "사이잘 (Saijal)", "Сизаль (Sizal)", "Henequén", "Agave Sisalana", "सिसल (Sisal)", "الیاف سیزال (Alīāf-e Sīzāl)", "Fibra de Sisal", "سيزال (Sīzāl)", "Chanvre", "Q'aytu", "پشم سیزال (Pashm-e Sīzāl)"],
  ramie: ["Ramie", "苎麻 (Zhùmá)", "ラミー (Ramī)", "모시 (Mosi)", "Ramia", "Ramie-Faser", "Рами (Rami)", "China Grass", "रामी (Rāmī)", "پارچه رامی (Parcha-ye Rāmī)", "Fibra de Ramio", "رامي (Rāmī)", "Chanvre", "Q'aytu"],
  kapok: ["Kapok", "木棉 (Mùmián)", "カポック (Kapokku)", "Ceiba", "Капок (Kapok)", "Fromager", "Sumaúma", "Randu", "木棉 (Mùmián)", "कपोک (Kapok)", "پنبه گیاهی (Panbe-ye Giāhi)", "Kapok", "قطن نباتي (Quṭn Nabātī)", "Q'aytu", "Fibra de Kapok"],
  pineapple: ["Pineapple Leaf", "Piña", "Piñatex™", "菠萝纤维 (Bōluó Xiānwéi)", "パイナップル (Painappuru)", "파인애플 (Painaepeul)", "Abacá de Piña", "Ananas-Faser", "菠萝纤维 (Bōluó Xiānwéi)", "अनानास फाइबर (Anānās Phāibar)", "الیاف آناناس (Alīāf-e Anānās)", "Pineapple Fiber", "ألياف الأناناس (Alyāf al-Anānās)", "Волокно ананаса (Volokno ananasa)", "Q'aytu", "Chanvre", "پوست آناناس (Pust-e Anānās)", "凤梨纤维 (Fènglí Xiānwéi)", "Piña Fiber"],
  alpaca: ["Alpaca", "羊驼 (Yángtuó)", "अल्पाका (Alpākā)", "الپاکا (Alpākā)", "Alpaga", "アルパカ (Arupaka)", "알파카 (Alpaka)", "Альпака (Alpaka)", "ألبكة (Alpaka)", "Alpaka", "Alpaca Suri", "Paco", "Alpaca", "Fibra de Alpaca"],
  cashmere: ["Cashmere", "开司米 (Kāisīmǐ)", "カシミヤ (Kashimiya)", "캐시미어 (Kaesimie)", "Cachemire", "Kaschmir", "Кашемир (Kashmir)", "पश्मीना (Pashmeena)", "Cachemira", "开司米 (Kāisīmǐ)", "پشم بز (Pashm-e Boz)", "کشمیر (Kashmir)", "Millma", "صوف الكشمير (Ṣūf al-Kashmīr)", "山羊绒 (Shānyáng Róng)"],
  nettle: ["Nettle", "荨麻 (Qiánmá)", "Ortie", "Brennnessel", "Ortiga", "Крапива (Krapiva)", "イラクサ (Irakusa)", "Allo", "बिच्छू बूटी (Bichchū Būṭī)", "گزنه (Gazne)", "قراص (Qurrās)", "Chanvre", "Q'aytu"],
  abaca: ["Abacá", "蕉麻 (Jiāomá)", "アバカ (Abaka)", "마닐라삼 (Manillasam)", "Manila Hemp", "Chanvre de Manille", "Manilahanf", "अबाका (Abākā)", "کنف مانیل (Kanaf-e Mānil)", "Fibra de Abacá", "ليف الموز (Līf al-Mawz)", "Абака (Abaka)", "Q'aytu"],
  mohair: ["Mohair", "Angora", "马海毛 (Mǎhǎimáo)", "安哥拉 (Āngēlā)", "モヘア (Mohea)", "アンゴラ (Angora)", "모헤어 (Mohe-eo)", "앙고라 (Anggora)", "Мохер (Mokher)", "Ангора (Angora)", "Angora Goat Fiber", "Mohair d'Angora", "马海毛 (Mǎhǎimáo)", "मोहयर (Mohayar)", "پشم موهر (Pashm-e Muhr)", "Mohair", "موهير (Mūhīr)", "Millma", "Fibra de Mohair", "安哥拉山羊毛 (Āngēlā Shānyáng Máo)"],
  lyocell: ["Lyocell", "Tencel™", "莱赛尔 (Láisàiěr)", "リヨセル (Riyoseru)", "라이오셀 (Raiosel)", "Лиоцелл (Liotsell)", "Lyocell-Faser", "लायोसेल (Lāyoseal)", "لیوسل (Lyusel)", "Lyocell", "ليوسيل (Lyūsīl)", "Chanvre", "Q'aytu", "Fibra de Lyocell", "پارچه لیوسل (Parcha-ye Lyusel)"],
  modal: ["Modal", "莫代尔 (Mòdàiěr)", "モダール (Modāru)", "모달 (Modal)", "Модал (Modal)", "Modalfaser", "Fibre Modale", "莫代尔 (Mòdàiěr)", "मोडल (Modal)", "پارچه مودال (Parcha-ye Modāl)", "Modal", "مودال (Mūdāl)", "Q'aytu", "Fibra de Modal", "莫代尔纤维 (Mòdàiěr Xiānwéi)"],
  kenaf: ["Kenaf", "洋麻 (Yángmá)", "ケナフ (Kenafu)", "케나프 (Kenapeu)", "Кенаф (Kenaf)", "Chanvre de Deccan", "Hibiscus Cannabinus", "केनाफ (Kenāph)", "کنف (Kanaf)", "Kenaf", "كناف (Kanāf)", "Q'aytu", "Fibra de Kenaf"],
  yak: ["Yak Fiber", "牦牛毛 (Máoniú Máo)", "ヤク (Yaku)", "야크 (Yakeu)", "Як (Yak)", "Fibre de Yack", "Yakwolle", "ཡག (Yag)", "牦牛毛 (Máoniú Máo)", "याक फाइबर (Yāk Phāibar)", "پشم یاک (Pashm-e Yāk)", "Yak Fiber", "صوف الياك (Ṣūf al-Yāk)", "Millma", "Fibra de Yak", "牦牛绒 (Máoniú Róng)", "Yak Wool"],
  banana: ["Banana Fiber", "芭蕉纤维 (Bājiāo Xiānwéi)", "バナナ繊維 (Banana Sen'i)", "바나나섬유 (Banana Seomyu)", "Fibra de Banana", "Bananenfaser", "Musa Textilis", "केला फाइबर (Kelā Phāibar)", "پوست موز (Pust-e Mūz)", "Banana Fiber", "ألياف الموز (Alyāf al-Mawz)", "Волокно банана (Volokno banana)", "Q'aytu", "Chanvre", "Banana Leaf Fiber"],
  cork: ["Cork", "软木 (Ruǎnmù)", "コルク (Koruku)", "코르크 (Koreukeu)", "Liège", "Kork", "Corcho", "Cortiça", "Пробка (Probka)", "कॉर्क (Kork)", "چوب پنبه (Chub-e Panbe)", "Cork", "فلين (Fellīn)", "Q'aytu"],
  lotus: ["Lotus Silk", "莲丝 (Liánsī)", "蓮糸 (Hasu Ito)", "연사 (Yeonsa)", "Soie de Lotus", "Lotusseide", "Seda de Loto", "Kyar Chi", "कमल रेशम (Kamal Resham)", "ابریشم گل نیلوفر (Abrisham-e Gol-e Nīlūfar)", "ハスイト (Hasu Ito)", "حرير اللوتس (Ḥarīr al-Lūtus)", "Шёлк лотоса (Shyolk lotosa)", "Q'aytu"],
  llama: ["Llama", "骆马 (Luòmǎ)", "ल्लामा (Llāmā)", "Llama", "リャマ (Ryama)", "라마 (Rama)", "Лама (Lama)", "لاما (Lāmā)", "Llama Fiber", "Fibra de Llama", "Qarwa", "لاما (Lāmā)", "Chanvre", "پشم لاما (Pashm-e Lāmā)"],
  bison: ["Bison", "野牛 (Yěniú)", "バイソン (Baison)", "바이슨 (Baiseun)", "Бизон (Bizon)", "Buffalo Fiber", "Bisonfaser", "भैंस फाइबर (Bhaiṃs Phāibar)", "پشم بوفالو (Pashm-e Būfālū)", "Fibra de Bisonte", "صوف البيسون (Ṣūf al-Bīsūn)", "Chanvre", "Millma"],
  qiviut: ["Qiviut", "麝牛绒 (Shèniú Róng)", "キヴィアック (Kiviakku)", "Musk Ox Down", "Кивиут (Kiviut)", "Qiviut-Faser", "किवियुट (Kiviyuṭ)", "پشم گاو مشک (Pashm-e Gāv-e Mushk)", "Qiviut", "صوف ثور المسك (Ṣūf Thawr al-Misk)", "Chanvre", "Millma", "Fibra de Qiviut"],
  camel: ["Camel Hair", "驼毛 (Tuómáo)", "ラクダ毛 (Rakuda Ke)", "낙타모 (Naktamo)", "Pelo de Camello", "Верблюжья шерсть", "ऊँट ऊन (Ūnṭ Ūn)", "پشم شتر (Pashm-e Shotor)", "وبر الجمل (Wabar al-Jamal)", "Millma", "Camel Hair", "Poil de Chameau", "Camel Wool"],
  henequen: ["Henequen", "龙舌兰纤维 (Lóngshélán Xiānwéi)", "エネケン (Eneken)", "Henequén", "Sisal Blanco", "Agave Fourcroydes", "हेनेक्वेन (Henekven)", "هنکن (Heneken)", "Henequén", "ليف الهينيكوين (Līf al-Hīnīkīn)", "Генекен (Geneken)", "Chanvre", "Q'aytu", "Fibra de Henequén"],
  "navajo-churro": ["Navajo-Churro", "纳瓦霍丘罗 (Nàwǎhuò Qiūluó)", "Churro Wool", "Lana Churro", "Navajo Sheep Fiber", "Diyogí", "纳瓦霍丘罗 (Nàwǎhuò Qiūluó)", "नावाजो चुरो (Nāvājo Curo)", "پشم ناواهو (Pashm-e Nāvāho)", "Lana Churro", "صوف نافاجو (Ṣūf Nāfājū)", "Навахо-Чурро (Navakho-Churro)", "Chanvre", "Millma", "Fibra de Churro", "纳瓦霍羊毛 (Nàwǎhuò Yángmáo)", "ナバホチュロウール (Navaho Churō Ūru)"],
  milkweed: ["Milkweed", "马利筋 (Mǎlìjīn)", "ミルクウィード (Mirukuwīdo)", "Asclépiade", "Seidenpflanze", "Asclepias", "马利筋 (Mǎlìjīn)", "दूधिया (Dūdhiyā)", "پنبه شیر (Panbe-ye Shīr)", "Milkweed", "صوف الحليب (Ṣūf al-Ḥalīb)", "Волокно молочая (Volokno molochaya)", "Q'aytu", "Fibra de Asclepias", "乳草纤维 (Rǔcǎo Xiānwéi)"],
  horsehair: ["Horsehair", "马鬃 (Mǎzōng)", "馬毛 (Bamo)", "말모 (Malmo)", "Crin de Cheval", "Rosshaar", "Crin", "Конский волос", "घोड़े के बाल (Ghoṛe ke Bāl)", "پشم اسب (Pashm-e Asb)", "Crin de Caballo", "شعر الحصان (Sha'r al-Ḥiṣān)", "Millma", "Fibra de Crin", "ウマゲ (Umage)"],
  "spider-silk": ["Spider Silk", "蛛丝 (Zhūsī)", "クモの糸 (Kumo no Ito)", "거미줄 (Geomijul)", "Soie d'Araignée", "Spinnenseide", "Seda de Araña", "Паучий шёлк", "蛛丝 (Zhūsī)", "मकड़ी रेशम (Makaṛī Resham)", "تار عنکبوت (Tār-e Ankabūt)", "حرير العنكبوت (Ḥarīr al-'Ankabūt)", "Q'aytu", "蜘蛛丝 (Zhīzhū Sī)"],
  esparto: ["Esparto", "Alfa", "エスパルト (Esuparto)", "Halfagras", "Sparte", "Esparto Grass", "حلفاء (Halfā')", "Stipa Tenacissima", "एस्पार्टो (Espārto)", "اسپارتو (Espārtū)", "Esparto", "إسبارتو (Isbārtū)", "Эспарто (Esparto)", "Q'aytu", "阿尔法草 (Ā'ěrfǎ Cǎo)", "Fibra de Esparto"],
  fique: ["Fique", "Cabuya", "Pita", "Fibra de Fique", "フィケ (Fike)", "피게 (Pige)", "Agavenfaser", "Fibre de Fique", "फिक (Fik)", "فیقه (Fīqe)", "Fique", "فيقة (Fīqa)", "Фике (Fike)", "Q'aytu", "菲克纤维 (Fēikè Xiānwéi)", "پارچه فیقه (Parcha-ye Fīqe)"],
  sweetgrass: ["Sweetgrass", "甜草 (Tiáncǎo)", "スイートグラス (Suītogurasu)", "Hierochloe", "Mariengras", "Herbe Sacrée", "Святая трава (Svyataya Trava)", "Wiingashk", "मीठी घास (Mīṭhī Ghās)", "چمن شیرین (Chaman-e Shīrīn)", "Hierba Dulce", "عشب الحلو (Ushb al-Ḥulw)", "Q'aytu"],
  raffia: ["Raffia", "拉菲草 (Lāfēi Cǎo)", "ラフィア (Rafia)", "라피아 (Rapia)", "Raphia", "Raffiabast", "Rafia", "Рафия (Rafiya)", "रैफिया (Raiphiyā)", "پارچه رافیا (Parcha-ye Rāfiyā)", "Raffia", "رافيا (Rāfiyā)", "Chanvre", "Q'aytu", "Fibra de Raffia"],
  loofah: ["Loofah", "丝瓜 (Sīguā)", "ヘチマ (Hechima)", "수세미 (Susemi)", "Luffa", "Éponge Végétale", "Estropajo", "Люффа (Lyuffa)", "लूफा (Lūphā)", "چوب لیف (Chub-e Līf)", "لوف (Lūf)", "Q'aytu"],
  merino: ["Merino", "美利奴 (Měilìnú)", "メリノ (Merino)", "메리노 (Merino)", "Mérinos", "Merinowolle", "Merino Fino", "Меринос (Merinos)"],
  columbia: ["Columbia", "哥伦比亚羊 (Gēlúnbǐyà Yáng)", "コロンビア (Koronbia)", "Columbia Wool", "Laine Columbia"],
  corriedale: ["Corriedale", "考力代 (Kǎolìdài)", "コリデール (Koridēru)", "코리데일 (Korideil)", "Corriedale-Wolle", "Laine Corriedale"],
  romney: ["Romney", "罗姆尼 (Luómǔní)", "ロムニー (Romunī)", "Romney Marsh", "Laine Romney", "Ромни (Romni)"],
  lincoln: ["Lincoln Longwool", "林肯长毛 (Línkěn Chángmáo)", "リンカーン (Rinkān)", "Lincoln Wolle", "Laine Lincoln", "Линкольн (Linkol'n)"],
  ayate: ["Ayate", "Maguey Cloth", "Ixtle", "Tela de Maguey", "Fibra de Agave", "Tilma"],
  krajood: ["Krajood", "กระจูด (Krajut)", "Sedge Grass", "Lepironia", "จูด (Jut)"],
  seagrass: ["Seagrass", "海草 (Hǎicǎo)", "海草 (Umikusa)", "해초 (Haecho)", "Herbe Marine", "Seegras", "Hierba Marina", "Морская трава"],
  pandan: ["Pandan", "班兰 (Bānlán)", "パンダン (Pandan)", "판단 (Pandan)", "Pandanus", "Schraubenpalme", "Vacoa", "'Ie Toga (Samoa)"],
  palm: ["Palm Fiber", "棕榈纤维 (Zōnglǘ Xiānwéi)", "パーム (Pāmu)", "야자 (Yaja)", "Fibre de Palmier", "Palmfaser", "Fibra de Palma", "Crin Végétal"],
  rambouillet: ["Rambouillet", "兰布依 (Lánbùyī)", "ランブイエ (Ranbuie)", "Rambouillet-Wolle", "Laine Rambouillet", "Рамбулье (Rambul'ye)"],
  "water-lily": ["Water Lily Fiber", "睡莲丝 (Shuìlián Sī)", "スイレン (Suiren)", "수련 (Suryeon)", "Fibre de Nénuphar", "Seerosenfaser", "Kyar Chi"],
  "water-hyacinth": ["Water Hyacinth", "凤眼莲 (Fèngyǎnlián)", "ホテイアオイ (Hotei Aoi)", "부세오이 (Buseoi)", "Jacinthe d'Eau", "Wasserhyazinthe", "Jacinto de Agua", "Водяной гиацинт", "Eichhornia", "Akasa Thamarai (Tamil)", "Kochuri Pana (Bengali)", "Lilac Devil", "Water Orchid"],
  sano: ["Sano", "Allo", "अल्लो (Allo)", "Himalayan Nettle", "ヒマラヤイラクサ (Himaraya Irakusa)", "Ortie de l'Himalaya", "Girardinia"],
  "river-reed": ["River Reed", "芦苇 (Lúwěi)", "アシ (Ashi)", "갈대 (Galdae)", "Roseau", "Schilf", "Caña", "Камыш (Kamysh)", "Phragmites"],
  igusa: ["Igusa", "イ草 (Igusa)", "Soft Rush", "Tatami Rush", "藺草 (Lǐncǎo)", "Jonc Doux", "Juncus Rush", "いぐさ"],
  /* ── Expansion Batch — Missing Fibers ── */
  vicuna: ["Vicuña", "维库尼亚 (Wéikùníyà)", "विकुन्या (Vikunyā)", "ویکونیا (Vikūnyā)", "Vicugna", "ビクーニャ (Bikūnya)", "Вику́нья (Vikun'ya)", "فيكونيا (Fīkūnyā)", "Vicoigne", "Vicuñafaser", "Wik'uña"],
  harakeke: ["Harakeke", "New Zealand Flax", "Lin de Nouvelle-Zélande", "Neuseelandflachs", "ニュージーランドフラックス (Nyūjīrando Furakkusu)", "Phormium", "Flax Māori"],
  lokta: ["Lokta", "लोक्ता (Loktā)", "Daphne Bark Fiber", "Papier Lokta", "Lokta-Papier", "Himalayan Paper"],
  "fig-barkcloth": ["Fig Barkcloth", "Mutuba", "Olubugo", "Écorce de Figuier", "Feigenrindenstoff", "무투바 (Mutuba)"],
  tapa: ["Tapa", "タパ (Tapa)", "Kapa", "Ngatu", "Siapo", "Tapa-Stoff", "Écorce Battue", "Kapa Wauke", "Washi", "和紙 (Washi)", "Kozo", "紙繊維"],
  "sunn-hemp": ["Sunn Hemp", "Sun Hemp", "Crotalaria", "सन (San)", "サンヘンプ (Sanhenpu)", "Chanvre Sunn", "Sonnenhanf", "Shana"],
  roselle: [
    "Roselle",
    "Zobo, Tsoborodo, or Isapa (Nigeria, West Africa)",
    "Bissap (Senegal, Wolof)",
    "Wonjo (Gambia, Mandinka)",
    "Wegda (Burkina Faso, Mossi)",
    "Kärkädē (Ethiopia, Amharic)",
    "Gongura (India, Telugu)",
    "Ambadi (India, Marathi)",
    "Chin baung (Myanmar, Burmese)",
    "Krachiap (Thailand, Thai)",
    "Rosela (Indonesia)",
    "Vinagreira, Caruru-azedo, or Rosela (Brazil, Portuguese)",
    "Sorrel (Caribbean)",
    "ローゼル (Rōzeru)",
  ],
  piassava: ["Piassava", "Piassaba", "Piaçava", "Bahia Piassava", "Palmfaser Piassava", "파이아사바 (Piasaba)"],
  sansevieria: ["Sansevieria", "Bowstring Hemp", "Snake Plant Fiber", "サンセベリア (Sanseberia)", "Chanvre Arc", "Père en Cage", "Tigerfaser"],
  "sabai-grass": ["Sabai Grass", "Bhabar Grass", "सबई घास (Sabai Ghās)", "Eulaliopsis", "Sabai Gras", "Bib Grass"],
  vetiver: ["Vetiver", "Khus", "Cuscus", "खस (Khas)", "ベチバー (Bechiba)", "Vétiver", "Vetiveria", "Khas Khas"],
  bombax: ["Bombax", "Silk Cotton", "Shalmali", "Red Cotton Tree", "शाल्मलि (Shālmali)", "Fromager Asiatique", "棉木 (Miánmù)"],
  curaua: ["Curauá", "Curaua", "クラウア (Kuraua)", "Bromeliad Fiber", "Fibra de Curauá", "Ananas Erectifolius"],
  chambira: ["Chambira", "Cumare", "Chambira Palm", "チャンビラ (Chanbira)", "Fibra de Chambira", "Tucuma Fiber"],
  /* ── Dye Profiles ── */
  indigo: ["Indigo", "靛蓝 (Diànlán)", "インディゴ (Indigo)", "인디고 (Indigo)", "Índigo", "Indigo (Indigofera)", "Индиго (Indigo)", "नील (Nīl)", "Çivit", "گل نیل (Gol-e Nīl)", "نيلي (Nīlī)", "Q'aytu", "Chanvre"],
  madder: ["Madder", "茜草 (Qiàncǎo)", "アカネ (Akane)", "꼭두서니 (Kkokduseonni)", "Garance", "Krapp", "Rubia", "Марена (Marena)", "Kök Boya"],
  turmeric: ["Turmeric", "姜黄 (Jiānghuáng)", "ウコン (Ukon)", "강황 (Ganghwang)", "Curcuma", "Kurkuma", "Cúrcuma", "हल्दी (Haldī)", "Zerdeçal"],
  woad: ["Woad", "菘蓝 (Sōnglán)", "ウォード (Wōdo)", "Pastel", "Waid", "Isatis", "Вайда (Vayda)", "Guède"],
  weld: ["Weld", "木犀草 (Mùxīcǎo)", "Gaude", "Wau", "Gualda", "Reseda", "Dyer's Rocket", "Резеда (Rezeda)"],
  logwood: ["Logwood", "苏木 (Sūmù)", "ログウッド (Roguwuddo)", "Campêche", "Blauholz", "Palo de Campeche", "Кампешевое дерево"],
  "osage-orange": ["Osage Orange", "桑橙 (Sāngchéng)", "Bois d'Arc", "Osagedorn", "Maclura", "Bodark"],
  "black-walnut": ["Black Walnut", "黑胡桃 (Hēi Hútao)", "ブラックウォールナット (Burakku Wōrunatto)", "Noyer Noir", "Schwarznuss", "Nogal Negro"],
  marigold: ["Marigold", "万寿菊 (Wànshòujú)", "マリーゴールド (Marīgōrudo)", "Tagète", "Studentenblume", "Cempasúchil", "Бархатцы (Barkhatcy)"],
  coreopsis: ["Coreopsis", "金鸡菊 (Jīnjījú)", "コレオプシス (Koreopushisu)", "Tickseed", "Mädchenauge", "Coréopsis"],
  pomegranate: ["Pomegranate", "石榴 (Shíliú)", "ザクロ (Zakuro)", "석류 (Seongnyu)", "Grenade", "Granatapfel", "Granada", "Гранат (Granat)", "انار (Anār)"],
  cochineal: ["Cochineal", "胭脂虫 (Yānzhīchóng)", "コチニール (Kochinīru)", "연지벌레 (Yeonjibeolle)", "Cochenille", "Koschenille", "Cochinilla", "Кошениль (Koshenil')"],
  lac: ["Lac", "紫胶 (Zǐjiāo)", "ラック (Rakku)", "Gomme-Laque", "Schellack", "Laca", "लाख (Lākh)", "Лак (Lak)"],
  ochre: ["Ochre", "赭石 (Zhěshí)", "オーカー (Ōkā)", "Ocre", "Ocker", "Ocre", "Охра (Okhra)", "गेरू (Gerū)"],
  "iron-oxide": ["Iron Oxide", "氧化铁 (Yǎnghuà Tiě)", "酸化鉄 (Sanka Tetsu)", "Oxyde de Fer", "Eisenoxid", "Óxido de Hierro", "Оксид железа"],
  shibori: ["Shibori", "絞り染め (Shibori-zome)", "扎染 (Zhārǎn)", "홀치기 (Holchigi)", "Shibori", "Plangi"],
  batik: ["Batik", "蜡染 (Làrǎn)", "バティック (Batikku)", "바틱 (Batik)", "Batique", "Wachsbatik", "Батик (Batik)"],
  ikat: ["Ikat", "经纬染 (Jīngwěi Rǎn)", "イカット (Ikatto)", "이카트 (Ikateu)", "Ikat", "Kasuri (Japan)", "Patola (India)", "Икат (Ikat)"],
  "avocado-dye": ["Avocado Dye", "牛油果染 (Niúyóuguǒ Rǎn)", "アボカド染め (Abokado-zome)", "Teinture Avocat"],
  annatto: ["Annatto", "胭脂树 (Yānzhīshù)", "アナトー (Anatō)", "Achiote", "Roucou", "Orlean", "Urucum", "Аннатто (Annatto)"],
  "onion-skins": ["Onion Skins", "洋葱皮 (Yángcōng Pí)", "タマネギの皮 (Tamanegi no Kawa)", "Pelure d'Oignon", "Zwiebelschale"],
  cutch: ["Cutch", "儿茶 (Ér Chá)", "カテキュー (Katekyū)", "Cachou", "Katechu", "खैर (Khair)", "Катеху (Katekhu)"],
  bloodroot: ["Bloodroot", "血根 (Xuègēn)", "ブラッドルート (Buraddorūto)", "Sanguinaire", "Blutwurzel"],
  brazilwood: ["Brazilwood", "苏木 (Sūmù)", "ブラジルウッド (Burajiruwuddo)", "Bois du Brésil", "Brasilholz", "Palo Brasil", "Pau-Brasil"],
  fustic: ["Fustic", "黄木 (Huángmù)", "フスティック (Fusutikku)", "Bois Jaune", "Gelbholz", "Palo Amarillo"],
  "oak-bark": ["Oak Bark", "橡树皮 (Xiàngshù Pí)", "オークバーク (Ōku Bāku)", "Écorce de Chêne", "Eichenrinde", "Corteza de Roble"],
  alder: ["Alder", "赤杨 (Chìyáng)", "ハンノキ (Hannoki)", "Aulne", "Erle", "Aliso", "Ольха (Ol'kha)"],
  "tea-dye": ["Tea Dye", "茶染 (Chárǎn)", "お茶染め (Ocha-zome)", "차염 (Chayeom)", "Teinture au Thé", "Teefärbung"],
  dahlia: ["Dahlia", "大丽花 (Dàlìhuā)", "ダリア (Daria)", "달리아 (Dallia)", "Dahlie", "Dalia", "Георгина (Georgina)"],
  safflower: ["Safflower", "红花 (Hónghuā)", "紅花 (Benibana)", "잇꽃 (Itkkot)", "Carthame", "Saflor", "Cártamo", "Сафлор (Saflor)"],
  elderberry: ["Elderberry", "接骨木 (Jiēgǔmù)", "エルダーベリー (Erudāberī)", "Sureau", "Holunder", "Saúco", "Бузина (Buzina)"],
  blackberry: ["Blackberry", "黑莓 (Hēiméi)", "ブラックベリー (Burakkuberī)", "Mûre", "Brombeere", "Mora", "Ежевика (Yezhevika)"],
  "mushroom-dyes": ["Mushroom Dyes", "蘑菇染 (Mógū Rǎn)", "キノコ染め (Kinoko-zome)", "Teinture aux Champignons", "Pilzfärbung"],
  "mollusk-purple": ["Tyrian Purple", "骨螺紫 (Gǔluó Zǐ)", "貝紫 (Kaimurasaki)", "Pourpre de Tyr", "Purpur", "Púrpura de Tiro", "Тирский пурпур"],
  "clay-pigments": ["Clay Pigments", "泥染 (Ní Rǎn)", "泥染め (Doro-zome)", "Pigments d'Argile", "Tonpigmente", "Bògòlanfini (Mali)"],
  "oak-galls": ["Oak Galls", "五倍子 (Wǔbèizǐ)", "没食子 (Mushokuji)", "Noix de Galle", "Galläpfel", "Agallas de Roble"],
  chlorophyll: ["Chlorophyll", "叶绿素 (Yèlǜsù)", "クロロフィル (Kurorofiru)", "Chlorophylle", "Chlorophyll", "Clorofila"],
  henna: ["Henna", "指甲花 (Zhǐjiǎhuā)", "ヘンナ (Henna)", "헤나 (Hena)", "Henné", "Henna", "Alheña", "مهندی (Mehndi)", "Хна (Khna)"],
  "solar-dyeing": ["Solar Dyeing", "日光染色 (Rìguāng Rǎnsè)", "ソーラー染め (Sōrā-zome)", "Teinture Solaire", "Sonnenfärbung"],
  "tie-dye": ["Tie-Dye", "扎染 (Zhārǎn)", "タイダイ (Taidai)", "Bandhani (India)", "Adire (Nigeria)", "Teinture Nouée", "Batik-Bindung"],
  /* ── Textile Profiles ── */
  "viscose-rayon": ["Viscose Rayon", "粘胶纤维 (Niánjiāo Xiānwéi)", "レーヨン (Rēyon)", "레이온 (Reion)", "Rayonne", "Viskose", "Rayón", "Вискоза (Viskoza)", "विस्कोज रेयॉन (Viskoj Reyon)", "ویسکوز رایون (Viskūz Rāyūn)", "Rayón Viscosa", "فيسكوز رايون (Fīskūz Rāyūn)", "Chanvre", "Q'aytu", "Fibra de Rayón"],
  cupro: ["Cupro", "铜氨纤维 (Tóng'ān Xiānwéi)", "キュプラ (Kyupura)", "큐프라 (Kyupeura)", "Cupra", "Cupro", "Bemberg™", "铜氨纤维 (Tóng'ān Xiānwéi)", "क्यूप्रो (Kyūpro)", "کوپرو (Kūpro)", "Cupro", "كوبرو (Kūbrū)", "Купро (Cupro)", "Chanvre", "Q'aytu", "Fibra de Cupro", "铜氨丝 (Tóng'ān Sī)"],
  "peace-silk": ["Peace Silk", "和平丝 (Hépíng Sī)", "ピースシルク (Pīsu Shiruku)", "Ahimsa Silk", "Soie de Paix", "Friedensseide", "Seda de Paz"],
  "bamboo-viscose": ["Bamboo Viscose", "竹粘胶 (Zhú Niánjiāo)", "バンブーレーヨン (Banbū Rēyon)", "Viscose de Bambou", "Bamboo Rayon"],
  felt: ["Felt", "毡 (Zhān)", "フェルト (Feruto)", "펠트 (Pelteu)", "Feutre", "Filz", "Fieltro", "Войлок (Voylok)", "Keçe"],
  denim: ["Denim", "牛仔布 (Niúzǎi Bù)", "デニム (Denimu)", "데님 (Denim)", "Jean", "Jeansstoff", "Mezclilla", "Деним (Denim)"],
  twill: ["Twill", "斜纹 (Xiéwén)", "ツイル (Tsuiru)", "능직 (Neungjik)", "Sergé", "Köper", "Sarga", "Саржа (Sarzha)"],
  "plain-weave": ["Plain Weave", "平纹 (Píngwén)", "平織り (Hiraori)", "평직 (Pyeongjik)", "Toile", "Leinwandbindung", "Tafetán", "Полотняное (Polotnyanoye)"],
  satin: ["Satin", "缎 (Duàn)", "サテン (Saten)", "새틴 (Saetin)", "Satin", "Atlas (Satin)", "Satén", "Атлас (Atlas)"],
  jacquard: ["Jacquard", "提花 (Tíhuā)", "ジャカード (Jakādo)", "자카드 (Jakadeu)", "Jacquard", "Jacquard-Weberei", "Жаккард (Zhakkard)"],
  tapestry: ["Tapestry", "挂毯 (Guàtǎn)", "タペストリー (Tapesutorī)", "태피스트리 (Taepiseutoeri)", "Tapisserie", "Tapisserie / Bildweberei", "Tapiz", "Гобелен (Gobelen)"],
  lace: ["Lace", "花边 (Huābiān)", "レース (Rēsu)", "레이스 (Reiseu)", "Dentelle", "Spitze", "Encaje", "Кружево (Kruzhevo)", "Dantel"],
  knitting: ["Knitting", "编织 (Biānzhī)", "編み物 (Amimono)", "니트 (Niteu)", "Tricot", "Stricken", "Tejido de punto", "Вязание спицами"],
  carpet: ["Carpet / Rug", "地毯 (Dìtǎn)", "カーペット (Kāpetto)", "카펫 (Kapet)", "Tapis", "Teppich", "Alfombra", "Ковёр (Kovyor)", "Halı"],
  spinning: ["Spinning", "纺纱 (Fǎngshā)", "紡績 (Bōseki)", "방적 (Bangjeok)", "Filage", "Spinnen", "Hilado", "Прядение (Pryadeniye)"],
  "cable-knit": ["Cable Knit", "绞花编织 (Jiǎohuā Biānzhī)", "ケーブル編み (Kēburu-ami)", "Tricot Torsadé", "Zopfmuster", "Punto de Cable"],
  dobby: ["Dobby Weave", "多臂提花 (Duōbì Tíhuā)", "ドビー織り (Dobī-ori)", "Tissage Dobby", "Schaftweberei"],
  muslin: ["Muslin", "细棉布 (Xì Miánbù)", "モスリン (Mosurin)", "무명 (Mumyeong)", "Mousseline", "Musselin", "Muselina", "Муслин (Muslin)"],
  flannel: ["Flannel", "法兰绒 (Fǎlánróng)", "フランネル (Furanneru)", "플란넬 (Peullanel)", "Flanelle", "Flanell", "Franela", "Фланель (Flanel')"],
  "block-print": ["Block Print", "木刻印花 (Mùkè Yìnhuā)", "ブロックプリント (Burokku Purinto)", "Impression au Bloc", "Blockdruck", "Estampado"],
  "leno-weave": ["Leno Weave", "纱罗 (Shāluó)", "紗 (Sha)", "Gaze / Leno", "Drehergewebe", "Gasa"],
};

/* ═══ PROCESS STEPS ═══ */
export interface ProcessStep {
  name: string;
  detail: string;
}

export const processData: Record<string, ProcessStep[]> = {
  hemp: [
    { name: "Cultivation", detail: "Sown densely in spring; grows 2-4m in ~100 days without irrigation" },
    { name: "Retting", detail: "Stalks soaked in water or left in fields to loosen bast fibers from woody core" },
    { name: "Breaking", detail: "Dried stalks passed through rollers to crack the hurd (woody core)" },
    { name: "Scutching", detail: "Beaten to separate bast fibers from broken hurd fragments" },
    { name: "Hackling", detail: "Combed through progressively finer pins to align and grade fibers" },
    { name: "Spinning", detail: "Drawn and twisted into yarn; may be cottonized for finer counts" },
  ],
  jute: [
    { name: "Harvesting", detail: "Cut by hand at flowering stage, ~100-120 days after sowing" },
    { name: "Retting", detail: "Bundled and submerged in slow-moving water for 10-30 days" },
    { name: "Stripping", detail: "Fibers pulled by hand from the retted stalk in long ribbons" },
    { name: "Washing", detail: "Stripped fibers washed in clean water to remove residual gum" },
    { name: "Drying", detail: "Sun-dried on bamboo frames or lines for 2-3 days" },
    { name: "Baling", detail: "Graded by color and strength, pressed into bales for export" },
  ],
  "flax-linen": [
    { name: "Pulling", detail: "Plants pulled (not cut) at maturity to preserve full fiber length" },
    { name: "Rippling", detail: "Seed bolls removed by drawing stalks through a comb" },
    { name: "Retting", detail: "Dew-retted on fields or water-retted to dissolve pectin binding" },
    { name: "Scutching", detail: "Broken stalks beaten to separate long line fibers from tow" },
    { name: "Hackling", detail: "Combed through hackle pins to parallelize and grade fiber" },
    { name: "Wet Spinning", detail: "Fibers wet-spun through hot water to produce smooth linen yarn" },
  ],
  "organic-cotton": [
    { name: "Planting", detail: "Seeds sown in spring when soil reaches 60°F (16°C); organic farms use non-GMO seeds and crop rotation to prevent soil depletion" },
    { name: "Growth & Cultivation", detail: "Plants mature over 120-180 days; organic methods rely on beneficial insects, trap cropping, and compost rather than synthetic pesticides" },
    { name: "Flowering & Boll Formation", detail: "White/yellow flowers bloom for one day, then close and form bolls; each boll contains 27-45 seeds surrounded by fiber" },
    { name: "Harvesting", detail: "Bolls open naturally when mature; mechanical pickers collect both fiber and seed in one pass; timing critical to preserve fiber quality" },
    { name: "Ginning", detail: "Saw gin separates lint fibers from seeds at 300-400 revolutions per minute; careful ginning preserves staple length" },
    { name: "Cleaning & Grading", detail: "Lint cleaned to remove leaf fragments and short fibers (linters); graded by staple length, strength, color, and trash content" },
    { name: "Baling & Storage", detail: "Compressed into 500-lb bales wrapped in burlap or polypropylene; stored in climate-controlled warehouses to prevent moisture damage" },
    { name: "Spinning Preparation", detail: "Bales opened, blended for consistency, carded into slivers, drawn into rovings, and finally spun into yarn" },
  ],
  silk: [
    { name: "Sericulture", detail: "Silkworms fed mulberry leaves for ~35 days until cocoon spinning" },
    { name: "Stifling", detail: "Cocoons heated to kill pupae before moth emergence breaks filament" },
    { name: "Degumming", detail: "Sericin coating softened in hot soapy water to free filament" },
    { name: "Reeling", detail: "Single continuous filament unwound from cocoon (up to 900m)" },
    { name: "Throwing", detail: "Multiple filaments twisted together to create yarn of desired weight" },
    { name: "Weaving", detail: "Yarn woven on looms; finished fabric may be further degummed for luster" },
  ],
  bamboo: [
    { name: "Harvesting", detail: "Mature culms (3-5 years) cut; regrows from root without replanting" },
    { name: "Chipping", detail: "Culms split and crushed into small chips for processing" },
    { name: "Pulping", detail: "Chips dissolved in alkali solution to extract cellulose" },
    { name: "Extrusion", detail: "Viscose solution forced through spinnerets into acid bath" },
    { name: "Regeneration", detail: "Cellulose filaments regenerate in the acid bath as solid fiber" },
    { name: "Finishing", detail: "Fibers washed, cut to staple length, crimped for spinning" },
  ],
  wool: [
    { name: "Shearing", detail: "Fleece shorn in one piece, typically in spring (~5 kg per sheep)" },
    { name: "Skirting", detail: "Inferior edges removed; fleece graded by fineness and length" },
    { name: "Scouring", detail: "Raw wool washed to remove lanolin, dirt, and vegetable matter" },
    { name: "Carding", detail: "Fibers opened and aligned into a continuous web or roving" },
    { name: "Combing", detail: "Worsted: long fibers combed parallel; short noils separated" },
    { name: "Spinning", detail: "Woolen (carded) or worsted (combed) yarns spun on mules or rings" },
  ],
  coir: [
    { name: "Husking", detail: "Coconut husk removed from shell after harvesting for copra/oil" },
    { name: "Retting", detail: "Husks soaked in brackish water for 6-12 months to soften" },
    { name: "Defibering", detail: "Retted husks beaten and pulled apart to extract fiber bundles" },
    { name: "Washing", detail: "Fibers rinsed to remove tannins and salt residue" },
    { name: "Drying", detail: "Sun-dried and sorted by length, color, and stiffness" },
    { name: "Baling", detail: "Fiber compressed into bales; or spun into rope/yarn/geotextile" },
  ],
  sisal: [
    { name: "Leaf Cutting", detail: "Mature leaves cut by hand from the rosette base of the agave" },
    { name: "Decortication", detail: "Leaves crushed between rollers to separate fiber from pulp" },
    { name: "Washing", detail: "Fibers washed to remove remaining pulp and chlorophyll" },
    { name: "Drying", detail: "Sun-bleached and dried on lines for 1-2 days" },
    { name: "Brushing", detail: "Dried fibers brushed to separate and align individual strands" },
    { name: "Grading", detail: "Sorted by length, color, and strength; baled for export" },
  ],
  ramie: [
    { name: "Harvest & decorticate", detail: "Perennial stems cut several times yearly; bark stripped while still pliable. Japanese producers tune roller speed and pressure to local ramie varieties for long, even ribbons." },
    { name: "Degumming", detail: "Alkali or enzyme baths dissolve pectins and gums binding the fiber. Enzyme-assisted routes run cooler with less harsh chemistry — common in Japanese premium lines and marketed as eco-degumming." },
    { name: "Bleach & soften", detail: "Peroxide bleaching and softeners improve whiteness and pliability. Niigata jōfu traditions sometimes lay woven cloth on snow to brighten shade and soften the hand before final finishing." },
    { name: "Spin", detail: "Long fibers drafted slightly damp to limit breakage; fine jōfu counts use careful twist control. Hand spinning survives where texture matters more than speed." },
    { name: "Weave & dye", detail: "Plain or tight weaves control fraying; kasuri ties pattern yarns before dyeing. Plant indigo and resist methods bond well with ramie cellulose." },
    { name: "Finish", detail: "Wash, stretch, and polish for even surface. Ojiya chijimi uses starch and controlled creasing for airy wrinkles; mills balance craft technique with volume for apparel and home textiles." },
  ],
  kapok: [
    { name: "Pod Collection", detail: "Mature seed pods hand-picked from trees (up to 70m tall)" },
    { name: "Pod Opening", detail: "Dried pods split to reveal the mass of silk-cotton fibers" },
    { name: "Fiber Extraction", detail: "Seeds separated from the surrounding floss by hand or machine" },
    { name: "Cleaning", detail: "Foreign matter and seed debris removed by air blowing" },
    { name: "Grading", detail: "Fiber graded by color, resilience, and moisture content" },
    { name: "Filling", detail: "Loose fill packed into pillows, mattresses, and life preservers" },
  ],
  pineapple: [
    { name: "Leaf Selection", detail: "Longest, healthiest leaves selected from harvested pineapple plants" },
    { name: "Scraping", detail: "Leaves scraped with broken ceramic plate to expose fiber bundles" },
    { name: "Knotting", detail: "Individual fibers hand-knotted end-to-end into continuous thread" },
    { name: "Washing", detail: "Threads washed and soaked to remove plant residue" },
    { name: "Drying", detail: "Air-dried in shade to preserve the fiber's natural sheen" },
    { name: "Weaving", detail: "Hand-woven on traditional looms into sheer, gossamer fabric" },
  ],
  alpaca: [
    { name: "Shearing", detail: "Fleece shorn annually in late spring; ~2.5 kg per animal" },
    { name: "Sorting", detail: "Fleece hand-sorted by fineness (baby, superfine, adult grades)" },
    { name: "Washing", detail: "Gently scoured; alpaca has no lanolin so requires less cleaning" },
    { name: "Dehairing", detail: "Guard hairs mechanically separated from fine undercoat" },
    { name: "Carding", detail: "Fibers opened, blended, and formed into rovings" },
    { name: "Spinning", detail: "Worsted or semi-worsted spun; often processed in Peru's mills" },
  ],
  cashmere: [
    { name: "Combing", detail: "Fine undercoat hand-combed during spring molt (~150g per goat)" },
    { name: "Sorting", detail: "Down separated from coarse guard hair by hand and machine" },
    { name: "Dehairing", detail: "Precision machines remove any remaining guard hair (>30 microns)" },
    { name: "Scouring", detail: "Gentle washing to remove dust and natural oils" },
    { name: "Dyeing", detail: "Stock-dyed for color consistency before spinning" },
    { name: "Spinning", detail: "Fine yarn spun on worsted system; 2-ply for strength" },
  ],
  nettle: [
    { name: "Harvesting", detail: "Stalks cut after flowering when fibers are strongest; gloves required" },
    { name: "Retting", detail: "Stalks water-retted or dew-retted for 1-3 weeks to loosen bast" },
    { name: "Breaking", detail: "Dried stalks broken to crack the woody core away from fibers" },
    { name: "Scutching", detail: "Fibers beaten and scraped to remove remaining pith and bark" },
    { name: "Hackling", detail: "Combed through pins to align and separate fine fibers from tow" },
    { name: "Spinning", detail: "Wet-spun for smooth yarn; can be cottonized for blending" },
  ],
  abaca: [
    { name: "Tuxying", detail: "Leaf sheaths stripped from the trunk in long ribbons by hand" },
    { name: "Stripping", detail: "Sheath ribbons pulled through a serrated knife to extract fiber" },
    { name: "Washing", detail: "Fibers rinsed in clean water to remove sap and plant residue" },
    { name: "Drying", detail: "Sun-dried on lines or frames for 1-2 days until pale cream" },
    { name: "Sorting", detail: "Graded by color, fineness, and strength into commercial grades" },
    { name: "Baling", detail: "Pressed into bales; or hand-knotted into rope and cordage" },
  ],
  mohair: [
    { name: "Shearing", detail: "Angora goats shorn twice yearly (spring & fall); ~2.3 kg per clip" },
    { name: "Sorting", detail: "Fleece graded by age: kid (finest), young goat, adult (coarsest)" },
    { name: "Scouring", detail: "Washed to remove grease (3-4% lanolin) and debris" },
    { name: "Carding", detail: "Fibers opened and aligned into a web or sliver for spinning" },
    { name: "Combing", detail: "Worsted preparation: fibers paralleled and short noils removed" },
    { name: "Spinning", detail: "Worsted-spun for smooth lustrous yarn; often blended with wool" },
  ],
  kenaf: [
    { name: "Sowing", detail: "Seeds broadcast in spring; grows 3-5m in 4-5 months" },
    { name: "Harvesting", detail: "Stalks cut at early flowering for optimal fiber quality" },
    { name: "Retting", detail: "Ribbon-retted or water-retted to separate bast from core" },
    { name: "Decortication", detail: "Mechanical separation of bast fiber from woody core (kenaf core)" },
    { name: "Washing", detail: "Fibers cleaned to remove retting residue and pectins" },
    { name: "Processing", detail: "Bast spun into yarn; core used for paper pulp and particle board" },
  ],
  yak: [
    { name: "Combing", detail: "Fine undercoat hand-combed during spring molt (~0.5 kg per animal)" },
    { name: "Sorting", detail: "Down separated from coarse outer guard hair by hand" },
    { name: "Dehairing", detail: "Mechanical dehairing removes remaining guard fibers (>20 microns)" },
    { name: "Scouring", detail: "Gentle wash to remove dust; yak down has very little grease" },
    { name: "Carding", detail: "Fibers opened and aligned; often blended with merino for consistency" },
    { name: "Spinning", detail: "Ring-spun into fine yarn; natural dark brown or dyed" },
  ],
  banana: [
    { name: "Trunk Selection", detail: "Pseudostems harvested after fruit bunch is cut; outer sheaths discarded" },
    { name: "Sheath Separation", detail: "Inner sheaths peeled and layered by hand from the trunk" },
    { name: "Fiber Extraction", detail: "Sheaths scraped with a ceramic or metal blade to extract fibers" },
    { name: "Washing", detail: "Fibers soaked and washed to remove sap and chlorophyll" },
    { name: "Drying", detail: "Sun-dried for 1-2 days until pale ivory" },
    { name: "Knotting & Spinning", detail: "Fibers hand-knotted end-to-end or machine-spun into yarn" },
  ],
  cork: [
    { name: "Stripping", detail: "Bark hand-harvested with curved axe every 9-12 years without harming tree" },
    { name: "Seasoning", detail: "Planks stacked outdoors for 6+ months to stabilize and cure" },
    { name: "Boiling", detail: "Planks boiled in water to expand, flatten, and sterilize" },
    { name: "Trimming", detail: "Outer woody layer removed; planks cut to uniform thickness" },
    { name: "Slicing", detail: "Shaved into ultra-thin sheets (0.5-1mm) for textile lamination" },
    { name: "Lamination", detail: "Cork veneer bonded to fabric backing for flexibility and strength" },
  ],
  lotus: [
    { name: "Harvest", detail: "Rainy-season cutting (~Jun–Nov) across lakes and ponds; Inle: offerings to Guardian Spirit, padonma kyar at full bloom, Lent peak — stems often gathered daily" },
    { name: "Fibre Extraction", detail: "While stems stay wet (often within ~24h); shallow knife; 5–6 stems snapped together → ~20–30 white filaments drawn, dried in lengths, rolled into singles; sponge fibres may be twisted with water on a table; many thread-makers can supply one weaver" },
    { name: "Yarn Preparation", detail: "Bamboo spinning frame and skeins; warping posts; threads kept ~40 m to limit tangles; coiled for storage; weft wound on bamboo bobbins" },
    { name: "Weaving", detail: "Narrow traditional loom (~24 in); weft/warp misted with water to keep fibre cool; ~100-yard batches may take ~6 weeks; industry estimates cite ~32k stems ≈1 m cloth, ~120k stems for a full outfit" },
    { name: "Natural Dyeing", detail: "Only natural dyes — bark, petals, leaves, fruit — yarn or fabric in skeins; sun-dried" },
    { name: "Use of Remnants", detail: "Leftover yarn → pagoda lamp wicks; fabric scraps → tiny sequined robes for Buddha images; consecrated Inle looms & five precepts where tradition dictates" },
  ],
  llama: [
    { name: "Shearing", detail: "Fleece shorn annually; ~1.5 kg of usable fiber per animal" },
    { name: "Sorting", detail: "Hand-sorted to separate fine undercoat from coarse guard hair" },
    { name: "Washing", detail: "Gently scoured; llama fiber has minimal lanolin" },
    { name: "Dehairing", detail: "Guard hairs mechanically or hand-removed for softer product" },
    { name: "Carding", detail: "Fibers opened and aligned into roving for spinning" },
    { name: "Spinning", detail: "Woolen-spun for lofty yarn; often used undyed in natural shades" },
  ],
  bison: [
    { name: "Collection", detail: "Shed fiber collected from fences and brush; or combed during spring molt" },
    { name: "Sorting", detail: "Fine down separated from coarse guard hair and debris" },
    { name: "Dehairing", detail: "Mechanical dehairing extracts ultra-fine down (10-18 microns)" },
    { name: "Scouring", detail: "Washed to remove dust and natural oils" },
    { name: "Carding", detail: "Fibers blended and carded into roving; often mixed with silk or merino" },
    { name: "Spinning", detail: "Spun into luxury yarn; natural chocolate-brown color retained" },
  ],
  qiviut: [
    { name: "Collection", detail: "Shed underwool gathered from tundra brush or combed from domesticated herds" },
    { name: "Sorting", detail: "Guard hair carefully separated from ultra-fine down by hand" },
    { name: "Washing", detail: "Gently scoured in lukewarm water; fiber is naturally clean" },
    { name: "Dehairing", detail: "Any remaining guard fibers removed by mechanical or hand methods" },
    { name: "Carding", detail: "Down fibers aligned into a delicate roving" },
    { name: "Hand Knitting", detail: "Traditionally lace-knitted by Alaskan Native cooperatives (Oomingmak)" },
  ],
  camel: [
    { name: "Collection", detail: "Soft undercoat collected during spring molt; ~2.5 kg per Bactrian camel" },
    { name: "Sorting", detail: "Fine down (17-24 microns) separated from coarse outer hair by hand" },
    { name: "Dehairing", detail: "Mechanical dehairing removes remaining guard fibers" },
    { name: "Scouring", detail: "Light washing; camel down has minimal grease content" },
    { name: "Dyeing", detail: "Often left natural tan/brown; can be bleached and dyed" },
    { name: "Spinning", detail: "Worsted or semi-worsted spun; prized for luxury overcoats" },
  ],
  henequen: [
    { name: "Leaf Cutting", detail: "Mature outer leaves cut by hand from the agave rosette" },
    { name: "Decortication", detail: "Leaves fed through a raspador machine to crush pulp and free fibers" },
    { name: "Washing", detail: "Fibers rinsed to remove remaining pulp, mucilage, and chlorophyll" },
    { name: "Drying", detail: "Sun-dried on lines or frames for 1-2 days until pale cream" },
    { name: "Brushing", detail: "Dried fibers brushed and combed to separate and align strands" },
    { name: "Baling", detail: "Graded by length and quality; baled for rope, twine, and carpet backing" },
  ],
  fique: [
    { name: "Leaf Harvesting", detail: "Lower leaves cut from the furcraea plant after 3-5 years of growth" },
    { name: "Decortication", detail: "Leaves scraped or machine-processed to extract long bast fibers" },
    { name: "Washing", detail: "Fibers soaked and rinsed in running water to remove plant residue" },
    { name: "Drying", detail: "Sun-dried on hillside frames; turns from green to pale gold" },
    { name: "Sorting", detail: "Graded by length, color, and strength for different end uses" },
    { name: "Spinning", detail: "Twisted into cordage or spun into yarn for sacks, hammocks, and espadrilles" },
  ],
  "navajo-churro": [
    { name: "Shearing", detail: "Fleece shorn by hand once or twice yearly; ~3-5 kg per sheep" },
    { name: "Skirting", detail: "Inferior edges and debris removed; fleece opened and assessed" },
    { name: "Washing", detail: "Hand-washed in successive baths; traditional yucca root soap used" },
    { name: "Carding", detail: "Fibers hand-carded between paddle cards into rolags for spinning" },
    { name: "Hand Spinning", detail: "Spun on a Navajo spindle (supported spindle) into single-ply or plied yarn" },
    { name: "Weaving", detail: "Woven on upright Navajo looms into rugs, blankets, and tapestries" },
  ],
  milkweed: [
    { name: "Pod Collection", detail: "Mature seed pods hand-picked in late autumn before they split fully" },
    { name: "Seed Separation", detail: "Floss carefully separated from seeds by hand or gentle mechanical means" },
    { name: "Cleaning", detail: "Loose fibers cleaned of stem debris and immature floss" },
    { name: "Blending", detail: "Hollow floss blended with cotton, wool, or synthetics for spinnability" },
    { name: "Carding", detail: "Blended fibers carded into batts for insulation or spun yarn" },
    { name: "Filling", detail: "Used as hypoallergenic fill for jackets, pillows, and comforters" },
  ],
  horsehair: [
    { name: "Collection", detail: "Tail and mane hair collected during grooming or from abattoir byproduct" },
    { name: "Sorting", detail: "Sorted by length (tail hair up to 90cm) and color (black, white, grey)" },
    { name: "Washing", detail: "Thoroughly washed and sanitized to remove oils and impurities" },
    { name: "Hackling", detail: "Combed through pins to straighten, align, and remove short fibers" },
    { name: "Twisting", detail: "Long hairs twisted or braided into cord, or woven as single strands" },
    { name: "Weaving", detail: "Woven into upholstery fabric, haircloth, or interlining on narrow looms" },
  ],
  "spider-silk": [
    { name: "Collection", detail: "Wild orb-weaver spiders collected and harnessed in silking frames" },
    { name: "Silking", detail: "Dragline silk drawn from spinnerets under controlled tension (~20m per spider)" },
    { name: "Reeling", detail: "Ultra-fine filaments wound onto spools; multiple filaments combined" },
    { name: "Plying", detail: "96+ individual filaments twisted together to form visible thread" },
    { name: "Dyeing", detail: "Thread can be naturally golden (Nephila) or dyed with natural pigments" },
    { name: "Weaving", detail: "Hand-woven on looms; a single textile may require 1 million+ spiders" },
  ],
  esparto: [
    { name: "Harvesting", detail: "Tufts pulled (not cut) by hand from dry hillsides in summer" },
    { name: "Soaking", detail: "Dried grass soaked in water for 24-48 hours to restore pliability" },
    { name: "Splitting", detail: "Softened leaves split lengthwise into finer strips for weaving" },
    { name: "Plaiting", detail: "Strips braided into continuous flat bands (pleita) by hand" },
    { name: "Coiling & Stitching", detail: "Braided bands coiled and stitched together into baskets and mats" },
    { name: "Finishing", detail: "Completed items dried, trimmed, and sometimes bleached or dyed" },
  ],
  sweetgrass: [
    { name: "Harvesting", detail: "Blades hand-picked in midsummer; pulled from base, not cut, to preserve root" },
    { name: "Drying", detail: "Bundled and hung in shade to dry slowly, preserving aromatic coumarin" },
    { name: "Sorting", detail: "Blades sorted by length and width; longest reserved for braiding" },
    { name: "Soaking", detail: "Dried grass briefly soaked before weaving to restore flexibility" },
    { name: "Braiding", detail: "Three-strand braids made for ceremonial and decorative use" },
    { name: "Coiled Basketry", detail: "Fine blades coiled and stitched into baskets, often with pine needle accents" },
  ],
  raffia: [
    { name: "Leaf Cutting", detail: "Young unopened leaves cut from the Raphia palm crown" },
    { name: "Stripping", detail: "Thin epidermal layer peeled from the leaflet upper surface by hand" },
    { name: "Drying", detail: "Strips sun-dried to pale straw color; width 1-3cm, length up to 1.5m" },
    { name: "Sorting", detail: "Graded by width, length, and uniformity for weaving or tying" },
    { name: "Dyeing", detail: "Natural raffia accepts plant dyes readily; often dyed before weaving" },
    { name: "Weaving / Knitting", detail: "Woven on looms or knitted into hats, bags, mats, and textiles" },
  ],
  loofah: [
    { name: "Growing", detail: "Luffa gourd left on vine past edibility until fully mature and dry" },
    { name: "Harvesting", detail: "Dried gourds picked from vine; outer skin has turned brown and papery" },
    { name: "Peeling", detail: "Dried skin peeled away by hand to reveal internal fiber skeleton" },
    { name: "Seed Removal", detail: "Seeds shaken out and saved for next season; fiber bleached if desired" },
    { name: "Washing", detail: "Soaked and rinsed repeatedly to remove sap and achieve desired softness" },
    { name: "Cutting", detail: "Cut to size for bath sponges, cleaning pads, or industrial filtration" },
  ],
  merino: [
    { name: "Shearing", detail: "Fleece shorn in one piece annually; ~4-5 kg of greasy wool per sheep" },
    { name: "Skirting & Classing", detail: "Fleece skirted, graded by micron (superfine <18.5, fine <20, medium <23)" },
    { name: "Scouring", detail: "Washed to remove 40-60% lanolin, suint, and vegetable matter" },
    { name: "Combing", detail: "Top-making: fibers combed into parallel sliver; short noils removed" },
    { name: "Drawing", detail: "Slivers drawn through gill boxes to thin and align for spinning" },
    { name: "Worsted Spinning", detail: "Ring-spun into fine worsted yarn; counts up to Nm 100+ for luxury fabrics" },
  ],
  columbia: [
    { name: "Shearing", detail: "Fleece shorn once in spring; ~5-7 kg of heavy, high-yield fleece" },
    { name: "Skirting", detail: "Edges removed and fleece opened for grading by staple and fineness" },
    { name: "Scouring", detail: "Washed to remove grease and range debris; moderate shrinkage" },
    { name: "Carding", detail: "Fibers opened and aligned into batts or sliver for spinning" },
    { name: "Combing", detail: "Longer staples combed for worsted preparation; shorter for woolen" },
    { name: "Spinning", detail: "Spun into medium-weight yarn; well-suited for hand spinning" },
  ],
  corriedale: [
    { name: "Shearing", detail: "Fleece shorn annually in spring; ~4-7 kg per sheep" },
    { name: "Skirting", detail: "Fleece opened and skirted; high-quality blanket sections separated" },
    { name: "Scouring", detail: "Washed to remove lanolin and debris; moderate grease content" },
    { name: "Carding", detail: "Fibers carded into rolags or batts; excellent for hand processing" },
    { name: "Spinning", detail: "Versatile: can be woolen or worsted spun with good results" },
    { name: "Felting / Dyeing", detail: "Takes dye vibrantly; felts reliably due to balanced crimp structure" },
  ],
  romney: [
    { name: "Shearing", detail: "Fleece shorn once in spring; ~4-6 kg of lustrous longwool" },
    { name: "Skirting", detail: "Fleece opened; long staples (125-200mm) preserved for worsted spinning" },
    { name: "Scouring", detail: "Washed to remove moderate grease; fiber retains natural luster" },
    { name: "Combing", detail: "Long fibers combed into top for worsted preparation" },
    { name: "Spinning", detail: "Worsted-spun for smooth, lustrous yarn ideal for outerwear and rugs" },
    { name: "Finishing", detail: "Yarn may be plied for strength; natural luster enhanced by washing" },
  ],
  lincoln: [
    { name: "Shearing", detail: "Heavy fleece shorn once annually; ~5-9 kg of long, lustrous wool" },
    { name: "Skirting", detail: "Fleece opened carefully to preserve extraordinary staple length (up to 38cm)" },
    { name: "Scouring", detail: "Washed gently; heavy grease content requires thorough rinsing" },
    { name: "Combing", detail: "Long fibers combed into top; exceptional luster revealed after processing" },
    { name: "Spinning", detail: "Worsted-spun on long-draft systems; produces strong, lustrous yarn" },
    { name: "Finishing", detail: "Yarn retains silk-like sheen; used for tapestry, doll hair, and blending" },
  ],
  ayate: [
    { name: "Leaf Harvesting", detail: "Mature maguey leaves (pencas) cut from the agave with a machete" },
    { name: "Retting", detail: "Leaves soaked or buried to soften and decompose non-fiber tissue" },
    { name: "Scraping", detail: "Retted leaves scraped on stone or board to extract ixtle fibers" },
    { name: "Washing", detail: "Fibers rinsed and beaten to remove remaining pulp" },
    { name: "Drying", detail: "Sun-dried until pale cream; fibers become flexible and strong" },
    { name: "Weaving", detail: "Hand-woven on backstrap looms into open-mesh cloth (ayate)" },
  ],
  krajood: [
    { name: "Harvesting", detail: "Mature sedge stems cut from freshwater wetlands during rainy season" },
    { name: "Splitting", detail: "Round stems split lengthwise into flat strips for weaving" },
    { name: "Drying", detail: "Strips sun-dried for several days until uniformly straw-colored" },
    { name: "Dyeing", detail: "Dried strips dyed with natural or synthetic colors for patterned work" },
    { name: "Soaking", detail: "Strips briefly soaked before weaving to restore pliability" },
    { name: "Weaving", detail: "Woven on floor frames into mats, bags, hats, and decorative items" },
  ],
  seagrass: [
    { name: "Cultivation", detail: "Coastal paddies and brackish/salty flats (notably Vietnam); stem character differs by region, country, and province" },
    { name: "Harvesting", detail: "Fields drained when mature; stems cut and bundled — herbaceous culms to ~2 m, ~5–7 mm triangular section" },
    { name: "Splitting & drying", detail: "Stems split and sun-dried; green skin over spongy white pith yields soft, lightweight, pliable straw" },
    { name: "Twisting", detail: "Well-dried fiber hand-plied into rope-like yarn; mills may wind onto tubes and load creels for carpet weaving" },
    { name: "Weaving", detail: "Hand-woven sleeping mats, baskets, homewares; twisted goods for rugs, seats, and wall coverings" },
    { name: "Patina", detail: "Natural greenish-beige deepens toward brown with light, age, and use" },
  ],
  pandan: [
    { name: "Leaf Harvesting", detail: "Long spiny-edged leaves cut from the pandanus plant base" },
    { name: "De-spining", detail: "Thorny edges stripped away with a knife or pulled through a notch" },
    { name: "Boiling", detail: "Leaves boiled to soften and sterilize; may be colored with plant dyes" },
    { name: "Drying", detail: "Boiled leaves sun-dried until flat and pliable" },
    { name: "Splitting", detail: "Dried leaves split into uniform-width strips for fine weaving" },
    { name: "Weaving", detail: "Strips woven into mats ('ie toga), bags, hats, tissue boxes, sandals, and ceremonial items" },
  ],
  palm: [
    { name: "Collection", detail: "Leaf sheaths, fruit husks, or trunk fibers collected as byproduct" },
    { name: "Retting", detail: "Sheaths soaked to soften and separate individual fiber bundles" },
    { name: "Beating", detail: "Retted material beaten to isolate fibers from non-fibrous tissue" },
    { name: "Drying", detail: "Fibers sun-dried; naturally dark brown to black color" },
    { name: "Sorting", detail: "Graded by length, stiffness, and color for end use" },
    { name: "Processing", detail: "Twisted into rope, woven into mats, or pressed into brush bristles" },
  ],
  rambouillet: [
    { name: "Shearing", detail: "Fleece shorn once in spring; ~4-6 kg of dense, fine wool" },
    { name: "Skirting", detail: "Fleece opened and graded; heavy grease content (high lanolin yield)" },
    { name: "Scouring", detail: "Thorough washing needed due to 25-45% lanolin content" },
    { name: "Combing", detail: "Fine fibers combed into top for worsted spinning; good staple length" },
    { name: "Drawing", detail: "Slivers drawn and doubled for evenness before spinning" },
    { name: "Spinning", detail: "Worsted or semi-worsted spun; suitable for fine suiting and knitwear" },
  ],
  "water-lily": [
    { name: "Craft: stem harvest", detail: "Long stems cut from lakes and ponds; must be processed fresh for hand-drawn filament (Inle-style)" },
    { name: "Craft: snap & draw", detail: "Stems snapped at intervals and gently pulled to extract internal micro-threads" },
    { name: "Craft: roll & dry", detail: "Filaments hand-rolled on the thigh; yarn air-dried in shade like lotus silk" },
    { name: "Craft: weave", detail: "Hand-woven on frame looms; extremely labor-intensive and rare" },
    { name: "Research: peduncle selection", detail: "Nymphaea rubra peduncles from wetland (e.g. Ruppur, Narayanganj, Bangladesh): smooth, fresh, flaw-free; upper flowering section removed after cleaning" },
    { name: "Research: biological extraction", detail: "Fibers biologically extracted from peduncle parenchyma beneath epidermis — distinct from snapping whole stems for artisan micro-filament" },
    { name: "Research: characterization", detail: "Reported analyses include composition, XRD, TGA/DSC, FTIR, EDX, tensile (single/bundle), and FESEM morphology" },
  ],
  "water-hyacinth": [
    { name: "Harvesting", detail: "Mature plants collected from ponds, lakes, or rivers (trials may use hundreds of plants per batch); stems typically tens of cm long" },
    { name: "Separation & wash", detail: "Leaves and roots removed from the stem; stems washed thoroughly" },
    { name: "Slit stems", detail: "Hollow petioles cut open lengthwise and flattened to expose inner fiber — key step in many lab and craft protocols" },
    { name: "Dry retting (sun)", detail: "Slit stems sun-dried until equilibrium moisture; often ~15–18 days; fibers shrink and separate (sometimes called dry retting)" },
    { name: "Optional pretreatment", detail: "Some trials use chemical treatment on stem fiber to raise absorbency before yarn formation" },
    { name: "Spinning & fabric", detail: "Fiber spun to yarn (open-end / rotor or ring spinning in trials), then woven on hand or sample looms; or beaten for pulp, rope, and paper" },
  ],
  sano: [
    { name: "Bark Harvesting", detail: "Outer bark stripped from giant nettle stalks in autumn after flowering" },
    { name: "Boiling", detail: "Bark strips boiled in ash-water for hours to dissolve binding pectins" },
    { name: "Beating", detail: "Boiled bark beaten with wooden mallets to separate individual fibers" },
    { name: "Washing", detail: "Fibers washed in running stream water to remove ash and residue" },
    { name: "Drying", detail: "Clean fibers sun-dried; turns from dark to pale cream" },
    { name: "Spinning", detail: "Hand-spun on a drop spindle or thigh-spun into strong, linen-like yarn" },
  ],
  "river-reed": [
    { name: "Harvesting", detail: "Mature stems cut in late summer or autumn when fully grown (2-4m)" },
    { name: "Bundling", detail: "Cut stems bundled and stood upright to dry naturally in the field" },
    { name: "Sorting", detail: "Dried stems sorted by diameter, length, and straightness" },
    { name: "Soaking", detail: "Stems soaked before use to restore flexibility for weaving" },
    { name: "Splitting", detail: "Thick stems may be split lengthwise into flat strips for fine work" },
    { name: "Weaving", detail: "Woven into mats, screens, thatch, baskets, and chair seats" },
  ],
  igusa: [
    { name: "Cultivation", detail: "Rush grown in flooded paddies on silty soils; cool flowing water improves stem length and pliability" },
    { name: "Harvesting", detail: "Stems cut in summer at maturity before hardening; washed to remove mud and debris" },
    { name: "Drying", detail: "Sun-dried in bundles; graded by thickness, straightness, and color" },
    { name: "Splitting", detail: "Green rind split into fine strips for tatami omote weaving; core reserved for fill and cordage" },
    { name: "Weaving", detail: "Hand-woven facing stitched to rice-straw or foam cores; also used for screens and crafts" },
    { name: "Finishing", detail: "Edges bound; mats aired to stabilize moisture before installation" },
  ],
  /* ── DYE PROCESS DATA ── */
  indigo: [
    { name: "Harvesting", detail: "Leaves harvested at peak indigotin content, typically mid-summer" },
    { name: "Composting", detail: "Fresh leaves soaked in water and fermented for 12-24 hours" },
    { name: "Oxidation", detail: "Liquid drained and beaten vigorously to oxidize dissolved indigo" },
    { name: "Settling", detail: "Indigotin precipitates; sediment settles and is collected as paste" },
    { name: "Drying", detail: "Paste pressed into cakes or blocks and dried for storage/trade" },
    { name: "Vat Reduction", detail: "Cakes dissolved in alkaline vat and chemically reduced to soluble leuco form for dyeing" },
  ],
  madder: [
    { name: "Cultivation", detail: "Plants grown 2-3 years to develop alizarin-rich root system" },
    { name: "Harvesting", detail: "Roots dug in autumn after second or third growing season" },
    { name: "Cleaning", detail: "Roots washed; outer bark removed to improve color purity" },
    { name: "Drying", detail: "Clean roots dried slowly in shade to preserve pigment content" },
    { name: "Grinding", detail: "Dried roots ground to powder or chopped into small chips" },
    { name: "Dyeing", detail: "Powder simmered with mordanted fiber at controlled temperature (60-70°C) to extract alizarin" },
  ],
  turmeric: [
    { name: "Harvesting", detail: "Rhizomes dug 7-10 months after planting when leaves yellow" },
    { name: "Boiling", detail: "Fresh rhizomes boiled 30-45 min to distribute curcumin evenly" },
    { name: "Drying", detail: "Boiled rhizomes sun-dried for 10-15 days until hard" },
    { name: "Grinding", detail: "Dried rhizomes ground to fine powder in stone or steel mills" },
    { name: "Dissolving", detail: "Powder dissolved in hot water to create vivid yellow dyebath" },
    { name: "Dyeing", detail: "Fiber immersed in dyebath; bonds directly without mordant" },
  ],
  woad: [
    { name: "Harvesting", detail: "First-year leaves harvested midsummer when indigotin peaks" },
    { name: "Crushing", detail: "Fresh leaves crushed into pulp using a woad mill or by hand" },
    { name: "Balling", detail: "Pulp formed into fist-sized balls and dried for 4-6 weeks" },
    { name: "Couching", detail: "Dried balls rewetted, crumbled, and composted in heaps for 9 weeks" },
    { name: "Vat Preparation", detail: "Composted woad dissolved in alkaline solution (urine or lye) and reduced" },
    { name: "Dyeing", detail: "Fiber dipped in reduced vat; blues develop on exposure to air" },
  ],
  weld: [
    { name: "Harvesting", detail: "Entire above-ground plant cut in late summer at seed-set stage" },
    { name: "Drying", detail: "Bundled and hung to dry in airy barn; retains potency for years" },
    { name: "Chopping", detail: "Dried stems and seed heads cut into small pieces for dye pot" },
    { name: "Extraction", detail: "Chopped plant simmered in water for 1-2 hours to extract luteolin" },
    { name: "Straining", detail: "Plant matter strained out; clear golden dyebath remains" },
    { name: "Dyeing", detail: "Alum-mordanted fiber simmered in dyebath for brilliant yellow" },
  ],
  logwood: [
    { name: "Felling", detail: "Mature trees felled; heartwood separated from pale sapwood" },
    { name: "Chipping", detail: "Dense heartwood chipped or rasped into small pieces" },
    { name: "Extraction", detail: "Chips simmered in water for several hours; liquid turns deep purple" },
    { name: "Straining", detail: "Chips removed; concentrated liquor may be reduced further" },
    { name: "Mordanting", detail: "Fiber pre-mordanted with alum (purple), iron (black), or chrome (blue)" },
    { name: "Dyeing", detail: "Mordanted fiber simmered in logwood bath; color develops over hours" },
  ],
  "osage-orange": [
    { name: "Harvesting", detail: "Heartwood chips or sawdust collected from pruning or milling" },
    { name: "Soaking", detail: "Chips soaked overnight in water to begin pigment extraction" },
    { name: "Simmering", detail: "Soaked chips simmered 1-2 hours; water turns intensely yellow" },
    { name: "Straining", detail: "Wood chips removed; clear golden dyebath ready for use" },
    { name: "Dyeing", detail: "Alum-mordanted fiber simmered in bath for bright yellow-gold" },
    { name: "Afterbath", detail: "Optional iron afterbath shifts color to olive or khaki green" },
  ],
  "black-walnut": [
    { name: "Collecting", detail: "Green hulls gathered in autumn as nuts fall from the tree" },
    { name: "Soaking", detail: "Hulls soaked in water for days to weeks; liquid darkens to deep brown" },
    { name: "Simmering", detail: "Hull solution simmered 1-2 hours to concentrate juglone pigment" },
    { name: "Straining", detail: "Hull matter removed; rich brown dyebath remains" },
    { name: "Dyeing", detail: "Fiber added directly — no mordant needed; color bonds permanently" },
    { name: "Rinsing", detail: "Dyed fiber rinsed until water runs clear; color is immediate and fast" },
  ],
  marigold: [
    { name: "Harvesting", detail: "Flower heads picked at full bloom throughout summer" },
    { name: "Drying", detail: "Flowers dried in shade or used fresh for strongest color" },
    { name: "Simmering", detail: "Flowers simmered in water for 30-60 minutes to extract pigment" },
    { name: "Straining", detail: "Spent flowers removed; warm golden dyebath remains" },
    { name: "Mordanting", detail: "Fiber pre-mordanted with alum for bright yellow; iron for olive" },
    { name: "Dyeing", detail: "Mordanted fiber simmered in dyebath for 1 hour; removed and rinsed" },
  ],
  coreopsis: [
    { name: "Harvesting", detail: "Dark-centered flower heads cut at peak bloom in midsummer" },
    { name: "Preparation", detail: "Flowers used fresh for reds or dried for gold/orange tones" },
    { name: "Extraction", detail: "Flowers simmered in water for 45-60 minutes" },
    { name: "Straining", detail: "Plant matter removed; dyebath ranges from gold to deep rust" },
    { name: "Mordanting", detail: "Alum mordant intensifies orange; iron shifts to brown-green" },
    { name: "Dyeing", detail: "Fiber simmered in dyebath; achieves deep color in 1-2 hours" },
  ],
  pomegranate: [
    { name: "Collecting", detail: "Rinds saved from eaten fruit; dried for long-term storage" },
    { name: "Soaking", detail: "Dried rinds soaked overnight to begin tannin extraction" },
    { name: "Simmering", detail: "Soaked rinds simmered 1-2 hours; liquid turns deep amber" },
    { name: "Straining", detail: "Rind pieces removed; tannin-rich dyebath remains" },
    { name: "Dyeing", detail: "Fiber immersed directly — substantive dye bonds without mordant" },
    { name: "Afterbath", detail: "Iron afterbath shifts yellow to deep olive-green or charcoal" },
  ],
  cochineal: [
    { name: "Cultivation", detail: "Insects raised on nopal cactus pads for 3-4 months" },
    { name: "Harvesting", detail: "Mature females brushed from cactus by hand; 3-4 harvests/year" },
    { name: "Killing", detail: "Harvested insects killed by heat (sun, oven, or steam)" },
    { name: "Drying", detail: "Dead insects sun-dried; lose 70% body weight; store indefinitely" },
    { name: "Grinding", detail: "Dried insects ground to powder to release carminic acid" },
    { name: "Dyeing", detail: "Powder dissolved in acidified water; mordanted fiber simmered for reds, pinks, purples" },
  ],
  lac: [
    { name: "Collection", detail: "Encrusted branches (sticklac) pruned from host trees twice yearly" },
    { name: "Scraping", detail: "Resin scraped from branches; raw sticklac contains dye, resin, and debris" },
    { name: "Washing", detail: "Sticklac soaked and agitated in water; dye dissolves into red solution" },
    { name: "Filtering", detail: "Red dye liquor separated from resin and insect debris" },
    { name: "Concentration", detail: "Dye liquor reduced by simmering to concentrate laccaic acid" },
    { name: "Dyeing", detail: "Alum-mordanted protein fiber simmered in concentrated lac bath for scarlet-crimson" },
  ],
  ochre: [
    { name: "Mining", detail: "Raw ochre mined or collected from exposed deposits and creek beds" },
    { name: "Grinding", detail: "Chunks ground to fine powder using mortar and pestle or ball mill" },
    { name: "Washing", detail: "Powder washed (levigated) to remove grit and grade particle size" },
    { name: "Calcining", detail: "Optional: heating transforms yellow goethite to red hematite" },
    { name: "Binding", detail: "Powder mixed with oil, gum, or water to form paint or paste" },
    { name: "Applying", detail: "Applied to cloth by painting, stamping, or rubbing; heat-set for permanence" },
  ],
  "iron-oxide": [
    { name: "Sourcing", detail: "Ferrous sulfate (copperas) purchased, or iron liquor made from rusty nails in vinegar" },
    { name: "Dissolving", detail: "Iron salt dissolved in warm water to create modifier solution" },
    { name: "Testing", detail: "Concentration tested on sample fiber — too much iron damages cellulose" },
    { name: "Afterbath", detail: "Dyed fiber dipped briefly (5-15 min) in iron solution to shift/darken color" },
    { name: "Rinsing", detail: "Fiber thoroughly rinsed to remove excess iron and prevent fiber damage" },
    { name: "Neutralizing", detail: "Optional chalk rinse to raise pH and stabilize the iron-tannin complex" },
  ],
  shibori: [
    { name: "Design", detail: "Pattern planned; technique selected (kanoko, arashi, itajime, nui, etc.)" },
    { name: "Binding", detail: "Cloth bound, stitched, folded, pleated, or clamped according to technique" },
    { name: "Wetting", detail: "Prepared cloth soaked in water to ensure even dye penetration" },
    { name: "Dyeing", detail: "Bound cloth dipped or immersed in indigo vat (or other dye)" },
    { name: "Oxidation", detail: "Cloth removed and exposed to air; blue develops as indigo oxidizes" },
    { name: "Releasing", detail: "Bindings removed to reveal resist pattern; cloth washed and dried" },
  ],
  batik: [
    { name: "Design", detail: "Pattern drawn on cloth in pencil or traced from template" },
    { name: "Waxing", detail: "Molten wax applied with tjanting (pen) or cap (stamp) on pattern areas" },
    { name: "Dyeing", detail: "Waxed cloth dyed in lightest color first; wax resists dye penetration" },
    { name: "Re-waxing", detail: "Additional wax applied to preserve first color before next dye bath" },
    { name: "Boiling", detail: "After all colors applied, cloth boiled to remove all wax" },
    { name: "Finishing", detail: "Cloth washed, starched, and ironed; may repeat for additional colors" },
  ],
  ikat: [
    { name: "Warping", detail: "Warp threads measured and stretched on frame to exact loom length" },
    { name: "Marking", detail: "Pattern areas marked on stretched threads with resist material" },
    { name: "Binding", detail: "Marked sections tightly wrapped with palm leaf, plastic, or thread" },
    { name: "Dyeing", detail: "Bound warp bundle immersed in dye; process repeated for each color" },
    { name: "Drying", detail: "Dyed warp dried and bindings carefully removed" },
    { name: "Weaving", detail: "Patterned warp mounted on loom; weft woven through with precise alignment" },
  ],
  "avocado-dye": [
    { name: "Collecting", detail: "Pits and skins saved from eaten avocados; rinsed of flesh" },
    { name: "Cleaning", detail: "Pits scrubbed and skins washed; papery pit skin removed or left on" },
    { name: "Simmering", detail: "Pits/skins simmered in water for 1-2 hours; liquid turns pink-red" },
    { name: "Straining", detail: "Solids removed; clear rosy dyebath remains" },
    { name: "Dyeing", detail: "Wet fiber added to dyebath and simmered 1-2 hours for pink" },
    { name: "Curing", detail: "Color deepens over 24-48 hours as tannins continue to oxidize" },
  ],
  annatto: [
    { name: "Harvesting", detail: "Spiky seed pods collected when ripe and split open naturally" },
    { name: "Seed Extraction", detail: "Seeds separated from pods and dried in sun" },
    { name: "Soaking", detail: "Seeds soaked in warm water or oil to dissolve bixin pigment coating" },
    { name: "Heating", detail: "Seed solution gently heated to intensify color extraction" },
    { name: "Straining", detail: "Seeds removed; vivid orange dyebath or paste remains" },
    { name: "Dyeing", detail: "Fiber immersed in annatto bath; alum mordant improves fastness" },
  ],
  "onion-skins": [
    { name: "Collecting", detail: "Dry outer skins saved from kitchen use over weeks or months" },
    { name: "Soaking", detail: "Skins covered with water and soaked overnight" },
    { name: "Simmering", detail: "Soaked skins simmered 30-60 minutes; rich amber-gold dyebath develops" },
    { name: "Straining", detail: "Skins removed; clear golden liquor ready for dyeing" },
    { name: "Dyeing", detail: "Wet fiber simmered in bath 1-2 hours for warm gold tones" },
    { name: "Afterbath", detail: "Iron afterbath produces olive/sage green; copper gives burnt orange" },
  ],
  cutch: [
    { name: "Heartwood Harvest", detail: "Acacia catechu heartwood chipped from mature trees" },
    { name: "Boiling", detail: "Chips boiled repeatedly in water to extract tannin-rich liquor" },
    { name: "Concentration", detail: "Extract reduced by evaporation to thick paste or solid blocks" },
    { name: "Dissolving", detail: "Block or powder dissolved in hot water to create dyebath" },
    { name: "Dyeing", detail: "Fiber simmered in cutch bath — substantive dye, no mordant needed" },
    { name: "Aftertreatment", detail: "Iron afterbath darkens to brown-gray; copper shifts to reddish tones" },
  ],
  bloodroot: [
    { name: "Harvesting", detail: "Rhizomes carefully dug in spring or autumn from woodland habitat" },
    { name: "Cleaning", detail: "Roots washed; distinctive red-orange sap bleeds on contact" },
    { name: "Chopping", detail: "Fresh or dried roots chopped into small pieces" },
    { name: "Extraction", detail: "Root pieces simmered in water for 1-2 hours to extract sanguinarine" },
    { name: "Straining", detail: "Root matter removed; orange-red dyebath remains" },
    { name: "Dyeing", detail: "Alum-mordanted fiber simmered in bath for orange-red to rose-pink" },
  ],
  brazilwood: [
    { name: "Felling", detail: "Mature heartwood harvested from sustainably cultivated trees" },
    { name: "Chipping", detail: "Dense heartwood rasped or chipped into fine shavings" },
    { name: "Soaking", detail: "Chips soaked in water for several days to begin extraction" },
    { name: "Simmering", detail: "Soaked chips simmered gently; brazilin oxidizes to deep red brazilein" },
    { name: "Straining", detail: "Wood chips removed; concentrated red dyebath ready" },
    { name: "Dyeing", detail: "Alum-mordanted fiber simmered for reds; tin mordant for vivid scarlet" },
  ],
  fustic: [
    { name: "Sourcing", detail: "Heartwood chips or sawdust from Maclura tinctoria timber" },
    { name: "Soaking", detail: "Chips soaked overnight in water to begin morin extraction" },
    { name: "Simmering", detail: "Soaked chips simmered 1-2 hours; liquid turns deep gold" },
    { name: "Straining", detail: "Wood removed; golden dyebath ready for use" },
    { name: "Dyeing", detail: "Alum-mordanted fiber simmered for warm yellow-gold" },
    { name: "Over-dyeing", detail: "Combined with indigo to produce greens; iron for olive-brown" },
  ],
  "oak-bark": [
    { name: "Harvesting", detail: "Inner bark stripped in spring when sap is rising and bark peels easily" },
    { name: "Drying", detail: "Bark strips dried in shade; stored in dry conditions for years" },
    { name: "Chopping", detail: "Dried bark broken into small chips or ground to coarse powder" },
    { name: "Extraction", detail: "Chips simmered in water for 2-3 hours to extract tannins" },
    { name: "Straining", detail: "Bark removed; tannin-rich amber dyebath remains" },
    { name: "Dyeing", detail: "Fiber simmered in bath — substantive dye bonds without mordant; iron darkens" },
  ],
  alder: [
    { name: "Harvesting", detail: "Inner bark stripped from young branches in spring" },
    { name: "Shredding", detail: "Fresh bark shredded or chopped into small pieces" },
    { name: "Simmering", detail: "Bark simmered in water 1-2 hours; liquid turns deep orange-red" },
    { name: "Straining", detail: "Bark removed; rich rust-colored dyebath remains" },
    { name: "Dyeing", detail: "Fiber immersed directly — no mordant needed; warm rust-brown develops" },
    { name: "Afterbath", detail: "Iron afterbath shifts to deep chocolate brown or near-black" },
  ],
  "tea-dye": [
    { name: "Brewing", detail: "Strong tea brewed using 10-15 bags or equivalent loose leaf per pot" },
    { name: "Steeping", detail: "Tea steeped 30-60 minutes for maximum tannin extraction" },
    { name: "Straining", detail: "Tea bags/leaves removed; dyebath is ready" },
    { name: "Immersing", detail: "Pre-wetted fabric placed in warm tea bath" },
    { name: "Soaking", detail: "Fabric left to soak 1-24 hours depending on depth desired" },
    { name: "Drying", detail: "Fabric removed, gently squeezed, and hung to dry; color sets on drying" },
  ],
  dahlia: [
    { name: "Harvesting", detail: "Flower heads cut at full bloom; deadheading encourages more blooms" },
    { name: "Preparation", detail: "Flowers used fresh or dried; dark varieties give richest colors" },
    { name: "Simmering", detail: "Flowers simmered in water for 45-60 minutes" },
    { name: "Straining", detail: "Spent flowers removed; warm golden-orange dyebath remains" },
    { name: "Mordanting", detail: "Alum mordant for bright yellow-orange; iron for olive tones" },
    { name: "Dyeing", detail: "Mordanted fiber simmered in dyebath for 1-2 hours" },
  ],
  safflower: [
    { name: "Harvesting", detail: "Flower petals plucked from heads at full bloom" },
    { name: "Yellow Wash", detail: "Petals soaked in cold water repeatedly to wash away yellow pigment" },
    { name: "Alkaline Extraction", detail: "Washed petals treated with alkaline ash-water to dissolve red carthamin" },
    { name: "Acid Precipitation", detail: "Red solution acidified (vinegar or citric acid) to precipitate dye" },
    { name: "Collection", detail: "Red precipitate collected and dissolved for dyebath" },
    { name: "Dyeing", detail: "Silk or protein fiber dyed directly in the precious red solution" },
  ],
  elderberry: [
    { name: "Harvesting", detail: "Ripe berry clusters cut from elder trees in late summer" },
    { name: "Crushing", detail: "Berries stripped from stems and crushed to release juice" },
    { name: "Simmering", detail: "Crushed berries simmered in water for 30-45 minutes" },
    { name: "Straining", detail: "Berry pulp strained out; deep purple dyebath remains" },
    { name: "Mordanting", detail: "Alum mordant for soft lavender; iron for gray-blue and slate" },
    { name: "Dyeing", detail: "Mordanted fiber simmered in dyebath; color develops in 1-2 hours" },
  ],
  blackberry: [
    { name: "Foraging", detail: "Ripe berries picked from wild brambles in late summer" },
    { name: "Crushing", detail: "Berries gently crushed to release purple juice" },
    { name: "Simmering", detail: "Crushed berries simmered in water for 30-45 minutes" },
    { name: "Straining", detail: "Pulp strained; purple-gray dyebath remains" },
    { name: "Dyeing", detail: "Fiber simmered in dyebath; yields soft muted purple-gray tones" },
    { name: "Curing", detail: "Color continues to shift and develop over days as anthocyanins oxidize" },
  ],
  "mushroom-dyes": [
    { name: "Foraging", detail: "Target species identified and collected during autumn mushroom season" },
    { name: "Cleaning", detail: "Mushrooms cleaned of debris; may be used fresh or dried" },
    { name: "Chopping", detail: "Mushrooms chopped or broken into small pieces for dye pot" },
    { name: "Extraction", detail: "Pieces simmered in water for 1-3 hours; time varies by species" },
    { name: "Straining", detail: "Mushroom matter removed; dyebath color depends on species" },
    { name: "Dyeing", detail: "Mordanted fiber simmered in bath; colors range from gold to violet to red" },
  ],
  "mollusk-purple": [
    { name: "Collection", detail: "Murex sea snails collected by hand from rocky Mediterranean shores" },
    { name: "Extraction", detail: "Hypobranchial gland carefully removed from each snail" },
    { name: "Crushing", detail: "Glands crushed in stone mortars; yields tiny amount of yellowish secretion" },
    { name: "Fermenting", detail: "Crushed glands mixed with salt and fermented in vats for days" },
    { name: "Reducing", detail: "Liquid slowly heated; color transforms from yellow-green to purple" },
    { name: "Dyeing", detail: "Fiber immersed in reduced vat; color deepens with sunlight exposure" },
  ],
  "clay-pigments": [
    { name: "Mining", detail: "Clay dug from specific deposits known for desired color" },
    { name: "Refining", detail: "Raw clay washed, sieved, and levigated to remove grit" },
    { name: "Fermenting", detail: "In bògòlanfini tradition, river mud fermented for up to a year" },
    { name: "Pre-treating", detail: "Cloth treated with tannin-rich plant solution (n'galama bark)" },
    { name: "Painting", detail: "Fermented mud painted onto pre-treated cloth in geometric patterns" },
    { name: "Bleaching", detail: "Unpainted areas bleached with caustic solution; mud areas become permanent" },
  ],
  "oak-galls": [
    { name: "Collection", detail: "Galls harvested from oak trees in autumn; Aleppo galls most prized" },
    { name: "Crushing", detail: "Dried galls crushed to powder to release gallotannin" },
    { name: "Infusion", detail: "Powder soaked in water or simmered gently to extract tannin" },
    { name: "Combining", detail: "For ink: tannin solution mixed with iron sulfate and gum arabic" },
    { name: "Dyeing", detail: "As dye: fiber simmered in gall extract, then afterbathed with iron" },
    { name: "Darkening", detail: "Iron-tannin complex develops over hours; darkens from tan to charcoal-black" },
  ],
  chlorophyll: [
    { name: "Sourcing", detail: "Chlorophyll extracted commercially from alfalfa, nettles, or spinach" },
    { name: "Copper Complex", detail: "Raw chlorophyll treated with copper to form stable chlorophyllin" },
    { name: "Dissolving", detail: "Water-soluble chlorophyllin dissolved in warm water for dyebath" },
    { name: "pH Adjustment", detail: "Bath pH adjusted to control shade (alkaline = bluer, acidic = yellower)" },
    { name: "Dyeing", detail: "Fiber immersed in dyebath; achieves green tones in 1-2 hours" },
    { name: "Fixing", detail: "Alum mordant improves lightfastness; rinse gently to preserve color" },
  ],
  henna: [
    { name: "Harvesting", detail: "Leaves picked from Lawsonia inermis shrubs during hot, dry season" },
    { name: "Drying", detail: "Leaves dried in shade to preserve lawsone content" },
    { name: "Grinding", detail: "Dried leaves ground to fine powder; sifted through mesh" },
    { name: "Mixing", detail: "Powder mixed with mildly acidic liquid (lemon juice, tea) to release dye" },
    { name: "Resting", detail: "Paste left 6-12 hours for dye release (demethylation of lawsone)" },
    { name: "Applying", detail: "Paste applied to skin (mehndi) or fiber immersed in henna bath for orange-brown" },
  ],
  "solar-dyeing": [
    { name: "Jar Preparation", detail: "Clean glass jar filled with water, dye material, and pre-wetted fiber" },
    { name: "Mordanting", detail: "Optional: alum or other mordant added directly to jar" },
    { name: "Sealing", detail: "Jar sealed with lid to prevent evaporation and contamination" },
    { name: "Sun Exposure", detail: "Jar placed in direct sunlight for 3-7 days; solar heat extracts dye" },
    { name: "Monitoring", detail: "Color checked daily; jar rotated for even sun exposure" },
    { name: "Finishing", detail: "Fiber removed, rinsed gently, and dried; color may deepen after removal" },
  ],
  "tie-dye": [
    { name: "Washing", detail: "Fabric pre-washed to remove sizing and ensure even dye uptake" },
    { name: "Folding", detail: "Fabric folded, spiraled, scrunched, or pleated for desired pattern" },
    { name: "Tying", detail: "Rubber bands, string, or clamps applied to hold resist pattern" },
    { name: "Dyeing", detail: "Dye applied by immersion, squeeze bottle, or brush to bound fabric" },
    { name: "Curing", detail: "Dyed fabric wrapped in plastic and left 6-24 hours for color to set" },
    { name: "Rinsing", detail: "Bindings removed; fabric rinsed from dark to light until water runs clear" },
  ],
  /* ── TEXTILE PROCESS DATA ── */
  felt: [
    { name: "Fiber Selection", detail: "Wool sorted by grade; fine-scale breeds (Merino) felt most readily" },
    { name: "Carding", detail: "Fibers opened and aligned into uniform batts or layers" },
    { name: "Layering", detail: "Multiple layers of carded fiber stacked with alternating grain direction" },
    { name: "Wetting", detail: "Layers sprinkled with hot soapy water to swell fiber scales" },
    { name: "Agitation", detail: "Layers rolled, pressed, and rubbed; scales interlock permanently" },
    { name: "Fulling", detail: "Fabric further shrunk and hardened by vigorous rolling and pounding" },
  ],
  denim: [
    { name: "Spinning", detail: "Cotton yarn ring-spun for warp; open-end spun for weft" },
    { name: "Dyeing", detail: "Warp yarn rope-dyed through 6-12 indigo baths for surface color" },
    { name: "Sizing", detail: "Dyed warp treated with starch for weaving strength" },
    { name: "Weaving", detail: "Indigo warp and white weft woven in 3/1 right-hand twill" },
    { name: "Finishing", detail: "Fabric singed, desized, and sanforized to control shrinkage" },
    { name: "Garment Wash", detail: "Finished jeans may be stone-washed, enzyme-washed, or raw (unwashed)" },
  ],
  jacquard: [
    { name: "Design", detail: "Pattern designed on graph paper or CAD software at thread level" },
    { name: "Programming", detail: "Design translated to punched cards (historic) or electronic data" },
    { name: "Warping", detail: "Thousands of individual warp threads wound onto loom beam" },
    { name: "Threading", detail: "Each warp end threaded through individual Jacquard hook and heddle" },
    { name: "Weaving", detail: "Jacquard head lifts specific threads per row to create figured pattern" },
    { name: "Finishing", detail: "Woven cloth inspected, steamed, and finished according to end use" },
  ],
  tapestry: [
    { name: "Design", detail: "Full-scale cartoon (drawing) prepared as weaving guide" },
    { name: "Warping", detail: "Strong warp threads (usually linen or cotton) stretched taut on frame" },
    { name: "Cartoon Placement", detail: "Cartoon placed behind or beneath warp as pattern reference" },
    { name: "Weaving", detail: "Colored weft threads woven back and forth within their own color area only" },
    { name: "Interlocking", detail: "Adjacent color areas joined by interlocking, slit, or dovetail technique" },
    { name: "Finishing", detail: "Completed tapestry removed from loom; warp ends secured; may be lined" },
  ],
  lace: [
    { name: "Pattern", detail: "Design pricked onto stiff parchment or card as pin guide" },
    { name: "Pinning", detail: "Pattern mounted on lace pillow; pins set at key intersection points" },
    { name: "Thread Management", detail: "Multiple threads wound on bobbins (bobbin lace) or single needle prepared" },
    { name: "Working", detail: "Threads crossed, twisted, and manipulated around pins to build pattern" },
    { name: "Advancing", detail: "Completed sections unpinned; pattern advanced for next repeat" },
    { name: "Finishing", detail: "Completed lace removed from pillow; stiffened, pressed, or blocked" },
  ],
  knitting: [
    { name: "Yarn & Needles", detail: "Yarn weight, fiber, and needle size chosen to hit gauge for the pattern" },
    { name: "Casting On", detail: "First row of live stitches placed on one or two needles (or machine set up with loops)" },
    { name: "Row Formation", detail: "Knit and purl stitches worked through active loops, building courses of intermeshed loops" },
    { name: "Shaping", detail: "Increases, decreases, and short rows sculpt fabric in flat, circular, or modular pieces" },
    { name: "Assembly", detail: "Pieces seamed or joined with kitchener graft, three-needle bind-off, or picked-up borders" },
    { name: "Finishing", detail: "Ends woven in; fabric blocked to dimensions with steam or wet blocking" },
  ],
  carpet: [
    { name: "Loom Setup", detail: "Vertical or horizontal loom strung with cotton or wool warp threads" },
    { name: "Knotting", detail: "Weaver ties individual knots (Turkish or Persian) around pairs of warp threads" },
    { name: "Beating", detail: "Each row of knots beaten down with heavy comb for density" },
    { name: "Weft Insertion", detail: "Structural weft threads passed between knot rows for stability" },
    { name: "Shearing", detail: "Pile surface trimmed level with sharp scissors during and after weaving" },
    { name: "Finishing", detail: "Carpet washed, stretched, dried, and fringe/edges secured" },
  ],
  spinning: [
    { name: "Fiber Prep", detail: "Raw fiber washed, picked, and carded or combed into roving" },
    { name: "Drafting", detail: "Fibers drawn out into a thin strand from the roving" },
    { name: "Twisting", detail: "Spindle or wheel rotation inserts twist to lock fibers together" },
    { name: "Winding On", detail: "Spun yarn wound onto spindle shaft or bobbin" },
    { name: "Plying", detail: "Two or more singles twisted together in opposite direction for strength" },
    { name: "Setting", detail: "Finished yarn soaked in water and dried under tension to set twist" },
  ],
  "cable-knit": [
    { name: "Casting On", detail: "Stitches cast onto needles in required number for pattern width" },
    { name: "Ribbing", detail: "Knit/purl rib pattern worked at edges for elastic fit" },
    { name: "Cable Setup", detail: "Pattern established with background and cable panel stitches" },
    { name: "Crossing", detail: "Stitches held on cable needle; adjacent stitches worked first, then held stitches" },
    { name: "Pattern Repeat", detail: "Cable crossing repeated at set intervals (typically every 4-8 rows)" },
    { name: "Blocking", detail: "Finished piece wet-blocked to open up cable definition and set dimensions" },
  ],
  "block-print": [
    { name: "Block Carving", detail: "Design carved in relief on teak or sheesham wood by master carver" },
    { name: "Cloth Prep", detail: "Fabric washed, bleached, and treated with mordant or tannin" },
    { name: "Dye Paste", detail: "Dye mixed with thickener (gum, flour) to create printing paste" },
    { name: "Stamping", detail: "Block dipped in dye pad and pressed firmly onto cloth in registration" },
    { name: "Repeat", detail: "Process repeated for each color using different blocks in sequence" },
    { name: "Fixing", detail: "Printed cloth steamed, washed, and sun-dried to fix colors" },
  ],
  roselle: [
    { name: "Cultivation", detail: "Warm, humid or dry-season suited; ~150–200 cm annual rainfall; ~25 cm soil moisture per month during growth. Adaptable with little care; reported stalk yields ~11 quintals/hectare." },
    { name: "Harvesting", detail: "Annual erect Malvaceae shrub; bast from peeled outer bark while calyces are often the main commercial crop. Maturity often cited ~90–120 days; some trials report ~3–3.5 m height in ~130–150 days." },
    { name: "Bacterial retting (BR)", detail: "Natural tank retting ~15–20 days at ~27 °C, pH ~6.5–7, fibre-to-liquid ~1:20 — slower but yields higher cellulose, better strength, modulus, and flexibility than chemical retting; light-gold colour." },
    { name: "Chemical retting (CR)", detail: "Faster alkali route (e.g. NaOH-based boil, neutralize, wash) — darker, stiffer fibre with lower tenacity and lustre; higher reported fibre yield % than BR but quality tradeoff." },
    { name: "Post-retting", detail: "Wash, sun- or air-dry, comb or card; optional mercerization (e.g. dilute NaOH) to boost strength, lustre, and dyeability." },
    { name: "Spinning & products", detail: "Carded strands spun into yarn; experimental plain weaves and composites. R&D targets enzymatic + controlled chemical retting for shorter time with BR-like quality." },
  ],
};

/* ═══ ANATOMY ═══ */
export interface AnatomyData {
  diameter: { raw: string; minUm?: number; maxUm?: number };
  crossSection: string;
  surfaceTexture: string;
  length: { raw: string; minMm?: number; maxMm?: number };
  tensileStrength: { raw: string; minMPa?: number; maxMPa?: number };
  moistureRegain: { raw: string; percentage?: number };
}

export const anatomyData: Record<string, AnatomyData> = {
  hemp: { diameter: { raw: "16-50 \u00b5m" }, crossSection: "Polygonal with lumen", surfaceTexture: "Rough, fibrillar striations", length: { raw: "5-55 mm (processed)", minMm: 5.0, maxMm: 55.0 }, tensileStrength: { raw: "550-900 MPa", minMPa: 550.0, maxMPa: 900.0 }, moistureRegain: { raw: "12%", percentage: 12.0 } },
  jute: { diameter: { raw: "17-20 \u00b5m" }, crossSection: "Polygonal, thick walls", surfaceTexture: "Smooth with nodes", length: { raw: "1.5-4 mm (ultimate cell)", minMm: 1.5, maxMm: 4.0 }, tensileStrength: { raw: "393-773 MPa", minMPa: 393.0, maxMPa: 773.0 }, moistureRegain: { raw: "13.75%", percentage: 13.75 } },
  "flax-linen": { diameter: { raw: "12-16 \u00b5m" }, crossSection: "Polygonal with central lumen", surfaceTexture: "Smooth, bamboo-like nodes", length: { raw: "25-30 mm (ultimate)", minMm: 25.0, maxMm: 30.0 }, tensileStrength: { raw: "345-1035 MPa", minMPa: 345.0, maxMPa: 1035.0 }, moistureRegain: { raw: "12%", percentage: 12.0 } },
  "organic-cotton": {
    diameter: { raw: "12-22 \u00b5m", minUm: 12, maxUm: 22 },
    crossSection: "Kidney-bean shaped with collapsed lumen (mature fiber)",
    surfaceTexture: "Twisted ribbon with natural convolutions (50-150 twists per inch)",
    length: { raw: "20-40 mm (Upland organic average)", minMm: 20, maxMm: 40 },
    tensileStrength: { raw: "287-597 MPa (varies by species and maturity)", minMPa: 287, maxMPa: 597 },
    moistureRegain: { raw: "8.5% (at 65% RH, 70\u00b0F)", percentage: 8.5 },
  },
  silk: { diameter: { raw: "10-13 \u00b5m" }, crossSection: "Triangular", surfaceTexture: "Smooth, glass-like", length: { raw: "600-900 m (filament)" }, tensileStrength: { raw: "500-740 MPa", minMPa: 500.0, maxMPa: 740.0 }, moistureRegain: { raw: "11%", percentage: 11.0 } },
  bamboo: { diameter: { raw: "12-14 \u00b5m" }, crossSection: "Round (regenerated)", surfaceTexture: "Smooth, serrated edges", length: { raw: "38-50 mm (cut staple)", minMm: 38.0, maxMm: 50.0 }, tensileStrength: { raw: "140-300 MPa", minMPa: 140.0, maxMPa: 300.0 }, moistureRegain: { raw: "13%", percentage: 13.0 } },
  wool: { diameter: { raw: "11.5-40 \u00b5m" }, crossSection: "Round to oval", surfaceTexture: "Overlapping cuticle scales", length: { raw: "38-125 mm (staple)", minMm: 38.0, maxMm: 125.0 }, tensileStrength: { raw: "120-174 MPa", minMPa: 120.0, maxMPa: 174.0 }, moistureRegain: { raw: "16%", percentage: 16.0 } },
  coir: { diameter: { raw: "100-460 \u00b5m" }, crossSection: "Round, hollow center", surfaceTexture: "Rough, pitted", length: { raw: "50-350 mm", minMm: 50.0, maxMm: 350.0 }, tensileStrength: { raw: "131-175 MPa", minMPa: 131.0, maxMPa: 175.0 }, moistureRegain: { raw: "10%", percentage: 10.0 } },
  sisal: { diameter: { raw: "100-300 \u00b5m" }, crossSection: "Horseshoe / crescent", surfaceTexture: "Coarse, stiff", length: { raw: "0.8-8 mm (ultimate cell)", minMm: 0.8, maxMm: 8.0 }, tensileStrength: { raw: "468-640 MPa", minMPa: 468.0, maxMPa: 640.0 }, moistureRegain: { raw: "11%", percentage: 11.0 } },
  ramie: { diameter: { raw: "25-30 \u00b5m" }, crossSection: "Oval with thick walls", surfaceTexture: "Smooth, silky luster", length: { raw: "40-250 mm (ultimate)", minMm: 40.0, maxMm: 250.0 }, tensileStrength: { raw: "400-938 MPa", minMPa: 400.0, maxMPa: 938.0 }, moistureRegain: { raw: "8.5%", percentage: 8.5 } },
  kapok: { diameter: { raw: "20-43 \u00b5m" }, crossSection: "Round, hollow tube", surfaceTexture: "Smooth, waxy cuticle", length: { raw: "10-35 mm", minMm: 10.0, maxMm: 35.0 }, tensileStrength: { raw: "93 MPa", minMPa: 93.0, maxMPa: 93.0 }, moistureRegain: { raw: "10.9%", percentage: 10.9 } },
  pineapple: { diameter: { raw: "20-80 \u00b5m" }, crossSection: "Ribbon-like, flat", surfaceTexture: "Smooth with serrations", length: { raw: "30-90 mm", minMm: 30.0, maxMm: 90.0 }, tensileStrength: { raw: "170-627 MPa", minMPa: 170.0, maxMPa: 627.0 }, moistureRegain: { raw: "12%", percentage: 12.0 } },
  alpaca: { diameter: { raw: "19-32 \u00b5m" }, crossSection: "Round, medullated core", surfaceTexture: "Low-scale frequency", length: { raw: "80-120 mm (staple)", minMm: 80.0, maxMm: 120.0 }, tensileStrength: { raw: "50-75 MPa", minMPa: 50.0, maxMPa: 75.0 }, moistureRegain: { raw: "15%", percentage: 15.0 } },
  cashmere: { diameter: { raw: "14-19 \u00b5m" }, crossSection: "Round, non-medullated", surfaceTexture: "Fine cuticle scales", length: { raw: "25-90 mm (staple)", minMm: 25.0, maxMm: 90.0 }, tensileStrength: { raw: "100-150 MPa", minMPa: 100.0, maxMPa: 150.0 }, moistureRegain: { raw: "14%", percentage: 14.0 } },
  nettle: { diameter: { raw: "20-50 \u00b5m" }, crossSection: "Polygonal with lumen", surfaceTexture: "Smooth with striations", length: { raw: "20-60 mm (processed)", minMm: 20.0, maxMm: 60.0 }, tensileStrength: { raw: "560-1600 MPa", minMPa: 560.0, maxMPa: 1600.0 }, moistureRegain: { raw: "11%", percentage: 11.0 } },
  abaca: { diameter: { raw: "10-30 \u00b5m" }, crossSection: "Polygonal bundles", surfaceTexture: "Smooth, slightly waxy", length: { raw: "3-9 mm (ultimate cell)", minMm: 3.0, maxMm: 9.0 }, tensileStrength: { raw: "400-980 MPa", minMPa: 400.0, maxMPa: 980.0 }, moistureRegain: { raw: "14%", percentage: 14.0 } },
  mohair: { diameter: { raw: "23-40 \u00b5m" }, crossSection: "Round, smooth cuticle", surfaceTexture: "Low-scale, high luster", length: { raw: "100-150 mm (staple)", minMm: 100.0, maxMm: 150.0 }, tensileStrength: { raw: "120-180 MPa", minMPa: 120.0, maxMPa: 180.0 }, moistureRegain: { raw: "13%", percentage: 13.0 } },
  kenaf: { diameter: { raw: "14-33 \u00b5m" }, crossSection: "Polygonal with lumen", surfaceTexture: "Rough, fibrillar", length: { raw: "2-6 mm (ultimate cell)", minMm: 2.0, maxMm: 6.0 }, tensileStrength: { raw: "284-930 MPa", minMPa: 284.0, maxMPa: 930.0 }, moistureRegain: { raw: "12%", percentage: 12.0 } },
  yak: { diameter: { raw: "16-20 \u00b5m" }, crossSection: "Round, partially medullated", surfaceTexture: "Smooth, fine scales", length: { raw: "30-50 mm (down staple)", minMm: 30.0, maxMm: 50.0 }, tensileStrength: { raw: "80-120 MPa", minMPa: 80.0, maxMPa: 120.0 }, moistureRegain: { raw: "15%", percentage: 15.0 } },
  banana: { diameter: { raw: "50-250 \u00b5m" }, crossSection: "Oval bundles with lumen", surfaceTexture: "Rough, striated surface", length: { raw: "1.5-4 mm (ultimate cell)", minMm: 1.5, maxMm: 4.0 }, tensileStrength: { raw: "529-914 MPa", minMPa: 529.0, maxMPa: 914.0 }, moistureRegain: { raw: "13%", percentage: 13.0 } },
  cork: { diameter: { raw: "30-40 \u00b5m (cell)" }, crossSection: "Hexagonal honeycomb cells", surfaceTexture: "Waxy suberin surface", length: { raw: "N/A (sheet material)" }, tensileStrength: { raw: "1-2 MPa (compression)", minMPa: 1.0, maxMPa: 2.0 }, moistureRegain: { raw: "6%", percentage: 6.0 } },
  lotus: { diameter: { raw: "3-5 \u00b5m" }, crossSection: "Round, multi-filament bundle; cellulosic aquatic stem fibre", surfaceTexture: "Ultra-smooth, silk-like; cloth often cool, crisp, crease-resistant", length: { raw: "Continuous (stem-length)" }, tensileStrength: { raw: "200-400 MPa", minMPa: 200.0, maxMPa: 400.0 }, moistureRegain: { raw: "12%", percentage: 12.0 } },
  llama: { diameter: { raw: "20-40 \u00b5m" }, crossSection: "Round, medullated core", surfaceTexture: "Low-scale, matte", length: { raw: "80-150 mm (staple)", minMm: 80.0, maxMm: 150.0 }, tensileStrength: { raw: "50-70 MPa", minMPa: 50.0, maxMPa: 70.0 }, moistureRegain: { raw: "14%", percentage: 14.0 } },
  bison: { diameter: { raw: "10-18 \u00b5m (down)" }, crossSection: "Round, non-medullated", surfaceTexture: "Fine cuticle, low scales", length: { raw: "25-50 mm (down staple)", minMm: 25.0, maxMm: 50.0 }, tensileStrength: { raw: "80-120 MPa", minMPa: 80.0, maxMPa: 120.0 }, moistureRegain: { raw: "16%", percentage: 16.0 } },
  qiviut: { diameter: { raw: "11-13 \u00b5m" }, crossSection: "Round, non-medullated", surfaceTexture: "Ultra-fine smooth scales", length: { raw: "40-70 mm (staple)", minMm: 40.0, maxMm: 70.0 }, tensileStrength: { raw: "60-100 MPa", minMPa: 60.0, maxMPa: 100.0 }, moistureRegain: { raw: "17%", percentage: 17.0 } },
  camel: { diameter: { raw: "17-24 \u00b5m (down)" }, crossSection: "Round, partially medullated", surfaceTexture: "Smooth, fine scales", length: { raw: "25-125 mm (down staple)", minMm: 25.0, maxMm: 125.0 }, tensileStrength: { raw: "80-150 MPa", minMPa: 80.0, maxMPa: 150.0 }, moistureRegain: { raw: "14%", percentage: 14.0 } },
  henequen: { diameter: { raw: "100-500 \u00b5m" }, crossSection: "Horseshoe / crescent bundles", surfaceTexture: "Coarse, stiff, waxy", length: { raw: "0.8-5 mm (ultimate cell)", minMm: 0.8, maxMm: 5.0 }, tensileStrength: { raw: "430-580 MPa", minMPa: 430.0, maxMPa: 580.0 }, moistureRegain: { raw: "10%", percentage: 10.0 } },
  fique: { diameter: { raw: "80-300 \u00b5m" }, crossSection: "Crescent / polygonal bundles", surfaceTexture: "Coarse with surface pits", length: { raw: "2-6 mm (ultimate cell)", minMm: 2.0, maxMm: 6.0 }, tensileStrength: { raw: "290-600 MPa", minMPa: 290.0, maxMPa: 600.0 }, moistureRegain: { raw: "11%", percentage: 11.0 } },
  "navajo-churro": { diameter: { raw: "30-56 \u00b5m" }, crossSection: "Round, double-coated", surfaceTexture: "Prominent cuticle scales; kemp fibers present", length: { raw: "75-150 mm (staple)", minMm: 75.0, maxMm: 150.0 }, tensileStrength: { raw: "100-150 MPa", minMPa: 100.0, maxMPa: 150.0 }, moistureRegain: { raw: "15%", percentage: 15.0 } },
  milkweed: { diameter: { raw: "20-50 \u00b5m" }, crossSection: "Round, hollow tube (80% void)", surfaceTexture: "Smooth, waxy cuticle", length: { raw: "20-30 mm", minMm: 20.0, maxMm: 30.0 }, tensileStrength: { raw: "~75 MPa", minMPa: 75.0, maxMPa: 75.0 }, moistureRegain: { raw: "8%", percentage: 8.0 } },
  horsehair: { diameter: { raw: "75-280 \u00b5m" }, crossSection: "Round, medullated core", surfaceTexture: "Smooth with fine cuticle scales", length: { raw: "200-900 mm (tail)", minMm: 200.0, maxMm: 900.0 }, tensileStrength: { raw: "200-260 MPa", minMPa: 200.0, maxMPa: 260.0 }, moistureRegain: { raw: "12%", percentage: 12.0 } },
  "spider-silk": { diameter: { raw: "1-4 \u00b5m" }, crossSection: "Round, solid core", surfaceTexture: "Ultra-smooth, glassy", length: { raw: "Continuous (dragline)" }, tensileStrength: { raw: "1000-1600 MPa", minMPa: 1000.0, maxMPa: 1600.0 }, moistureRegain: { raw: "~5%", percentage: 5.0 } },
  esparto: { diameter: { raw: "50-150 \u00b5m" }, crossSection: "Ribbon-like, folded V", surfaceTexture: "Rough, siliceous surface", length: { raw: "0.5-2.5 mm (ultimate cell)", minMm: 0.5, maxMm: 2.5 }, tensileStrength: { raw: "200-400 MPa", minMPa: 200.0, maxMPa: 400.0 }, moistureRegain: { raw: "11%", percentage: 11.0 } },
  sweetgrass: { diameter: { raw: "30-80 \u00b5m" }, crossSection: "Oval, thin-walled", surfaceTexture: "Smooth, slightly waxy", length: { raw: "Full blade (300-600 mm)" }, tensileStrength: { raw: "Low (weaving fiber)" }, moistureRegain: { raw: "10%", percentage: 10.0 } },
  raffia: { diameter: { raw: "40-100 \u00b5m" }, crossSection: "Flat, ribbon-like epidermal strip", surfaceTexture: "Smooth, glossy surface", length: { raw: "Up to 1500 mm (strip)" }, tensileStrength: { raw: "100-250 MPa", minMPa: 100.0, maxMPa: 250.0 }, moistureRegain: { raw: "10%", percentage: 10.0 } },
  loofah: { diameter: { raw: "150-500 \u00b5m" }, crossSection: "Irregular, networked vascular bundles", surfaceTexture: "Rough, porous, sponge-like", length: { raw: "Full gourd skeleton (200-500 mm)" }, tensileStrength: { raw: "~10-15 MPa", minMPa: 10.0, maxMPa: 15.0 }, moistureRegain: { raw: "12%", percentage: 12.0 } },
  merino: { diameter: { raw: "11.5-24 \u00b5m" }, crossSection: "Round, non-medullated", surfaceTexture: "High-frequency cuticle scales; pronounced crimp", length: { raw: "65-100 mm (staple)", minMm: 65.0, maxMm: 100.0 }, tensileStrength: { raw: "120-180 MPa", minMPa: 120.0, maxMPa: 180.0 }, moistureRegain: { raw: "16%", percentage: 16.0 } },
  columbia: { diameter: { raw: "23-31 \u00b5m" }, crossSection: "Round to oval, non-medullated", surfaceTexture: "Medium cuticle scales", length: { raw: "90-130 mm (staple)", minMm: 90.0, maxMm: 130.0 }, tensileStrength: { raw: "120-160 MPa", minMPa: 120.0, maxMPa: 160.0 }, moistureRegain: { raw: "15%", percentage: 15.0 } },
  corriedale: { diameter: { raw: "25-31 \u00b5m" }, crossSection: "Round, non-medullated", surfaceTexture: "Medium scales; balanced crimp", length: { raw: "90-150 mm (staple)", minMm: 90.0, maxMm: 150.0 }, tensileStrength: { raw: "120-170 MPa", minMPa: 120.0, maxMPa: 170.0 }, moistureRegain: { raw: "15%", percentage: 15.0 } },
  romney: { diameter: { raw: "30-39 \u00b5m" }, crossSection: "Round, partially medullated", surfaceTexture: "Low-scale; high luster", length: { raw: "125-200 mm (staple)", minMm: 125.0, maxMm: 200.0 }, tensileStrength: { raw: "130-175 MPa", minMPa: 130.0, maxMPa: 175.0 }, moistureRegain: { raw: "14%", percentage: 14.0 } },
  lincoln: { diameter: { raw: "34-41 \u00b5m" }, crossSection: "Round, medullated", surfaceTexture: "Very low scales; silk-like luster", length: { raw: "200-380 mm (staple)", minMm: 200.0, maxMm: 380.0 }, tensileStrength: { raw: "140-190 MPa", minMPa: 140.0, maxMPa: 190.0 }, moistureRegain: { raw: "13%", percentage: 13.0 } },
  ayate: { diameter: { raw: "100-400 \u00b5m" }, crossSection: "Crescent / polygonal bundles", surfaceTexture: "Coarse, stiff, fibrillar", length: { raw: "1-5 mm (ultimate cell)", minMm: 1.0, maxMm: 5.0 }, tensileStrength: { raw: "300-500 MPa", minMPa: 300.0, maxMPa: 500.0 }, moistureRegain: { raw: "10%", percentage: 10.0 } },
  krajood: { diameter: { raw: "200-500 \u00b5m (stem)" }, crossSection: "Round, hollow pith", surfaceTexture: "Smooth, waxy epidermis", length: { raw: "Full stem (500-1500 mm)" }, tensileStrength: { raw: "Low-moderate" }, moistureRegain: { raw: "12%", percentage: 12.0 } },
  seagrass: { diameter: { raw: "5–7 mm (stem)" }, crossSection: "Triangular culm; spongy white pith under green epidermis", surfaceTexture: "Smooth green rind; soft pith — elastic, hygroscopic", length: { raw: "Stem to ~2000 mm" }, tensileStrength: { raw: "Low-moderate (weaving structural)" }, moistureRegain: { raw: "14% (pith holds moisture)", percentage: 14.0 } },
  pandan: { diameter: { raw: "50-200 \u00b5m (strip)" }, crossSection: "Flat, fibrous layer", surfaceTexture: "Smooth upper / rough lower", length: { raw: "Full leaf (500-2000 mm)" }, tensileStrength: { raw: "Low-moderate" }, moistureRegain: { raw: "11%", percentage: 11.0 } },
  palm: { diameter: { raw: "100-500 \u00b5m" }, crossSection: "Round to oval, variable", surfaceTexture: "Rough, lignified", length: { raw: "50-300 mm (fiber)", minMm: 50.0, maxMm: 300.0 }, tensileStrength: { raw: "100-400 MPa", minMPa: 100.0, maxMPa: 400.0 }, moistureRegain: { raw: "10%", percentage: 10.0 } },
  rambouillet: { diameter: { raw: "18-24 \u00b5m" }, crossSection: "Round, non-medullated", surfaceTexture: "High-frequency scales; dense crimp", length: { raw: "65-100 mm (staple)", minMm: 65.0, maxMm: 100.0 }, tensileStrength: { raw: "120-175 MPa", minMPa: 120.0, maxMPa: 175.0 }, moistureRegain: { raw: "16%", percentage: 16.0 } },
  "water-lily": { diameter: { raw: "~87 \u00b5m mean (\u00b130 \u00b5m, N. rubra peduncle ultimate); 3\u20138 \u00b5m hand-drawn stem filament", minUm: 57.0, maxUm: 117.0 }, crossSection: "Solid, no central lumen (FESEM, N. rubra peduncle); artisan path is round multi-filament bundle", surfaceTexture: "Hills-and-valley micro-relief (lab fiber); hand-drawn filament smooth, silk-like", length: { raw: ">12 mm staple (textile minimum, peduncle study); peduncle ~59 cm; artisan continuous stem draw", minMm: 12.0, maxMm: 600.0 }, tensileStrength: { raw: "~91 MPa (\u00b140 MPa, N. rubra single fiber)", minMPa: 51.0, maxMPa: 131.0 }, moistureRegain: { raw: "~14.6%", percentage: 14.58 } },
  "water-hyacinth": { diameter: { raw: "15-35 \u00b5m" }, crossSection: "Oval to round, lignified bundles; hollow spongy petiole before processing", surfaceTexture: "Coarse, fibrillar; leaves waxy above water", length: { raw: "0.8-3 mm (ultimate cell); petiole segments to ~1 m plant height", minMm: 0.8, maxMm: 3.0 }, tensileStrength: { raw: "250-450 MPa", minMPa: 250.0, maxMPa: 450.0 }, moistureRegain: { raw: "11%", percentage: 11.0 } },
  sano: { diameter: { raw: "20-60 \u00b5m" }, crossSection: "Polygonal with lumen", surfaceTexture: "Rough, fibrillar", length: { raw: "15-50 mm (processed)", minMm: 15.0, maxMm: 50.0 }, tensileStrength: { raw: "500-1400 MPa", minMPa: 500.0, maxMPa: 1400.0 }, moistureRegain: { raw: "11%", percentage: 11.0 } },
  "river-reed": { diameter: { raw: "200-1000 \u00b5m (stem)" }, crossSection: "Round, hollow", surfaceTexture: "Smooth, siliceous epidermis", length: { raw: "Full stem (1000-4000 mm)" }, tensileStrength: { raw: "Low (structural)" }, moistureRegain: { raw: "12%", percentage: 12.0 } },
  igusa: { diameter: { raw: "1-4 mm (stem)" }, crossSection: "Round, hollow pith; green epidermis", surfaceTexture: "Smooth, slightly waxy when dried", length: { raw: "Stem typically 600-1500 mm" }, tensileStrength: { raw: "Low-moderate (weaving structural)" }, moistureRegain: { raw: "13%", percentage: 13.0 } },
  roselle: {
    diameter: { raw: "16.07-20.2 \u00b5m (Nigeria BR/CR study)", minUm: 16.07, maxUm: 20.2 },
    crossSection:
      "Polygonal bast with lumen. Nigerian BR vs CR study: BR ~55.6–60.4% cellulose, ~27–33.7% hemicellulose, ~10.5–11.4% lignin; CR ~48.6–56.6% cellulose, ~31.9–38.1% hemicellulose, ~11.6–12.5% lignin; ash ~0.9–2.7%; density ~1.35–1.46 g/cm\u00b3.",
    surfaceTexture:
      "BR: light gold, more flexible, hairy; CR: dark gold, stiffer, less lustre. Bundle appearance can vary along the length of retted strands.",
    length: { raw: "2.10-2.8 mm (ultimate, microscopy)", minMm: 2.1, maxMm: 2.8 },
    tensileStrength: {
      raw: "Single-fibre (ASTM-style): BR ~146-178 MPa, E ~21-25 GPa, \u03b5 0.5-0.7%; CR ~135-159 MPa, E ~20-24 GPa, \u03b5 0.4-0.6%",
      minMPa: 135.15,
      maxMPa: 177.55,
    },
    moistureRegain: { raw: "Moisture content ~9.5-11% (BR), ~13-14.5% (CR)", percentage: 10.27 },
  },
};

/* ═══ CARE ═══ */
export interface CareData {
  washTemp: string;
  dryMethod: string;
  ironTemp: string;
  specialNotes: string;
  /** Expanded textile care copy (profile enhancement); optional for legacy entries. */
  washing?: string;
  drying?: string;
  ironing?: string;
  stainRemoval?: string;
  storage?: string;
  specialConsiderations?: string;
}

const rawCareData: Record<string, CareData> = {
  hemp: { washTemp: "Cold to warm (30-40\u00b0C)", dryMethod: "Line dry or tumble low", ironTemp: "High (200\u00b0C)", specialNotes: "Softens with each wash; may shrink 3-5% on first wash" },
  jute: { washTemp: "Spot clean or dry clean", dryMethod: "Air dry flat", ironTemp: "Low (110\u00b0C)", specialNotes: "Avoid prolonged water exposure; fibers weaken when wet" },
  "flax-linen": { washTemp: "Warm (40\u00b0C)", dryMethod: "Line dry; tumble low briefly", ironTemp: "High (230\u00b0C) while damp", specialNotes: "Iron while slightly damp for best results; wrinkles are part of linen's character" },
  "organic-cotton": {
    washTemp: "Warm (30-40\u00b0C)",
    dryMethod: "Tumble dry low or line dry",
    ironTemp: "Medium-high with steam (cotton setting ~380\u00b0F / 193\u00b0C)",
    specialNotes: "Expect 3-5% shrinkage on first wash unless preshrunk; separate colors on first wash",
    washing: "Machine wash warm or cold (60-90\u00b0F / 15-32\u00b0C); hot water (140\u00b0F+) causes excessive shrinkage in untreated fabrics",
    drying: "Tumble dry low or line dry; high heat degrades cellulose over time and sets wrinkles. Remove while slightly damp to minimize ironing",
    ironing: "Iron at medium-high heat (cotton setting: 380\u00b0F / 193\u00b0C) with steam; natural fiber responds well to moisture and heat for crease removal",
    stainRemoval: "Pre-treat oil-based stains with dish soap; use oxygen bleach (sodium percarbonate) for color-safe whitening; avoid chlorine bleach on colors",
    storage: "Store clean and completely dry in breathable containers; cellulose fibers yellow with exposure to light and acidic conditions (avoid cardboard boxes for long-term storage)",
    specialConsiderations:
      "First wash: expect 3-5% shrinkage unless preshrunk or sanforized. Organic cotton softens significantly with repeated washing as natural waxes are removed. Pilling occurs with short-staple fibers; long-staple (Pima, Egyptian) pills less.",
  },
  silk: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry in shade", ironTemp: "Low (110\u00b0C) with cloth", specialNotes: "Never wring; use pH-neutral detergent; avoid direct sunlight" },
  bamboo: { washTemp: "Cold to warm (30\u00b0C)", dryMethod: "Line dry or tumble low", ironTemp: "Low (110\u00b0C)", specialNotes: "Avoid bleach; fabric softener not needed due to natural softness" },
  wool: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Medium (150\u00b0C) with steam", specialNotes: "Superwash merino is machine washable; avoid agitation to prevent felting" },
  coir: { washTemp: "Shake and spot clean", dryMethod: "Air dry outdoors", ironTemp: "Do not iron", specialNotes: "Naturally resistant to saltwater, mold, and rot" },
  sisal: { washTemp: "Spot clean only", dryMethod: "Air dry; avoid moisture", ironTemp: "Do not iron", specialNotes: "Water can cause staining and fiber damage; vacuum regularly" },
  ramie: { washTemp: "Warm (40\u00b0C)", dryMethod: "Line dry", ironTemp: "High (200\u00b0C) while damp", specialNotes: "Low elasticity means garments hold shape well; avoid repeated folding at same crease" },
  kapok: { washTemp: "Surface clean only", dryMethod: "Air and fluff in sun", ironTemp: "Do not iron (filling)", specialNotes: "Highly flammable; keep away from open flame; fluff regularly" },
  pineapple: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry in shade", ironTemp: "Low (100\u00b0C) with cloth", specialNotes: "Extremely delicate; store flat; avoid folding" },
  alpaca: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Low (110\u00b0C) with steam", specialNotes: "No lanolin = hypoallergenic; pills less than wool; store with cedar" },
  cashmere: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Low (110\u00b0C) with steam", specialNotes: "Use cashmere comb for pilling; fold, never hang; rest between wears" },
  nettle: { washTemp: "Warm (40\u00b0C)", dryMethod: "Line dry", ironTemp: "High (200\u00b0C) while damp", specialNotes: "Softens dramatically with washing; similar care to linen; very durable" },
  abaca: { washTemp: "Spot clean or dry clean", dryMethod: "Air dry flat", ironTemp: "Low (110\u00b0C) with cloth", specialNotes: "Strongest natural fiber when wet; salt-water resistant; avoid prolonged creasing" },
  mohair: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Low (120\u00b0C) with steam", specialNotes: "Does not felt easily; retains luster after washing; avoid moth exposure" },
  kenaf: { washTemp: "Warm (30-40\u00b0C)", dryMethod: "Line dry", ironTemp: "Medium (150\u00b0C)", specialNotes: "Blends well with cotton and polyester; UV resistant; stiffens when wet" },
  yak: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Low (110\u00b0C) with steam", specialNotes: "Warmer than merino; does not shrink easily; naturally odor-resistant" },
  banana: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry in shade", ironTemp: "Low (110\u00b0C) with cloth", specialNotes: "Naturally biodegradable; may stiffen after washing; handle gently when wet" },
  cork: { washTemp: "Wipe with damp cloth", dryMethod: "Air dry", ironTemp: "Do not iron", specialNotes: "Water-resistant, stain-resistant, antimicrobial; avoid sharp objects and prolonged sun" },
  lotus: { washTemp: "Cold hand wash (15-20\u00b0C)", dryMethod: "Flat dry in shade", ironTemp: "Low (100\u00b0C) with cloth", specialNotes: "Extremely delicate and rare; natural lotus fragrance; blends with cotton/silk common; producers keep fibre damp while weaving — finished cloth still needs gentle care" },
  llama: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Low (110\u00b0C) with steam", specialNotes: "Minimal lanolin; less prone to felting than wool; naturally flame-resistant" },
  bison: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Low (110\u00b0C) with steam", specialNotes: "Warmer than wool; non-allergenic; does not shrink; wind-resistant" },
  qiviut: { washTemp: "Cold hand wash (15-20\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Do not iron", specialNotes: "8x warmer than wool by weight; does not shrink or felt; extremely rare" },
  camel: { washTemp: "Cold hand wash or dry clean", dryMethod: "Flat dry on towel", ironTemp: "Low (110\u00b0C) with steam", specialNotes: "Thermally regulating; naturally water-repellent; can be brushed to restore nap" },
  henequen: { washTemp: "Spot clean only", dryMethod: "Air dry", ironTemp: "Do not iron", specialNotes: "Extremely durable; resistant to saltwater; stiffens when wet" },
  fique: { washTemp: "Spot clean or hand wash", dryMethod: "Air dry", ironTemp: "Do not iron", specialNotes: "Very strong wet or dry; resistant to stretch and abrasion" },
  "navajo-churro": { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Medium (150\u00b0C) with steam", specialNotes: "Naturally water-resistant dual coat; low-grease fleece; moth-resistant" },
  milkweed: { washTemp: "Surface clean only (fill)", dryMethod: "Air and fluff in sun", ironTemp: "Do not iron (fill)", specialNotes: "Hollow fibers trap air for warmth; hypoallergenic; clusters may shift — use baffled construction" },
  horsehair: { washTemp: "Spot clean or dry clean", dryMethod: "Air dry", ironTemp: "Do not iron", specialNotes: "Extremely resilient; retains shape indefinitely; naturally moisture-wicking" },
  "spider-silk": { washTemp: "Do not wash (museum textile)", dryMethod: "N/A", ironTemp: "Do not iron", specialNotes: "Strongest natural fiber known; contracts in humidity; extremely rare and precious" },
  esparto: { washTemp: "Wipe or brush clean", dryMethod: "Air dry", ironTemp: "Do not iron", specialNotes: "Naturally resistant to moisture and insects; may become brittle with age if unprotected" },
  sweetgrass: { washTemp: "Do not wash", dryMethod: "N/A", ironTemp: "Do not iron", specialNotes: "Sacred ceremonial material; coumarin fragrance fades over years; store in dry, dark place" },
  raffia: { washTemp: "Spot clean only", dryMethod: "Air dry flat", ironTemp: "Do not iron", specialNotes: "Stiffen with water then re-soften; avoid prolonged moisture; reshape while damp" },
  loofah: { washTemp: "Rinse and squeeze after each use", dryMethod: "Hang to air dry completely", ironTemp: "Do not iron", specialNotes: "Replace every 3-4 weeks for hygiene; microwave 30 sec to sanitize; fully biodegradable" },
  merino: { washTemp: "Cold hand wash or machine gentle (20-30\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Low (120\u00b0C) with steam", specialNotes: "Superwash-treated merino is machine washable; naturally odor-resistant; wear multiple times between washes" },
  columbia: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Medium (150\u00b0C) with steam", specialNotes: "Medium fiber requires less careful handling than fine wool; good for beginner spinners" },
  corriedale: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Medium (150\u00b0C) with steam", specialNotes: "Felts easily — avoid agitation in wash; excellent dye uptake; versatile for any craft" },
  romney: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry or line dry", ironTemp: "Medium (150\u00b0C) with steam", specialNotes: "Naturally water-resistant; long staple resists pilling; lustrous finish improves with wear" },
  lincoln: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry or line dry", ironTemp: "Medium (150\u00b0C) with steam", specialNotes: "Heavy yarn; hang with care to avoid stretching; silk-like luster increases after washing" },
  ayate: { washTemp: "Hand wash cold", dryMethod: "Air dry flat", ironTemp: "Do not iron", specialNotes: "Softens with use and washing; open mesh allows airflow; traditionally used as carrying cloth" },
  krajood: { washTemp: "Wipe with damp cloth", dryMethod: "Air dry", ironTemp: "Do not iron", specialNotes: "Naturally water-resistant; avoid prolonged soaking; wipe with damp cloth to clean" },
  seagrass: { washTemp: "Vacuum or wipe clean", dryMethod: "Air dry", ironTemp: "Do not iron", specialNotes: "Naturally stain-resistant; greenish-beige shifts toward brown in light and age; spongy pith responds to humidity — avoid soaking" },
  pandan: { washTemp: "Wipe or brush clean", dryMethod: "Air dry", ironTemp: "Do not iron", specialNotes: "Store flat to prevent warping; avoid prolonged sun exposure; re-soak briefly to reshape" },
  palm: { washTemp: "Shake and brush clean", dryMethod: "Air dry", ironTemp: "Do not iron", specialNotes: "Highly rot-resistant; naturally antimicrobial; extremely durable in outdoor use" },
  rambouillet: { washTemp: "Cold hand wash (20\u00b0C)", dryMethod: "Flat dry on towel", ironTemp: "Low (120\u00b0C) with steam", specialNotes: "Similar care to merino; dense crimp provides excellent resilience and memory" },
  "water-lily": { washTemp: "Cold hand wash (15-20\u00b0C)", dryMethod: "Flat dry in shade", ironTemp: "Low (100\u00b0C) with cloth", specialNotes: "Hand-drawn stem fabric: extremely rare and fragile — treat like finest silk. Peduncle-extracted cellulosic fiber from research is a different stream with coarser staple and distinct processing." },
  "water-hyacinth": { washTemp: "Spot clean or cold hand wash (20-30\u00b0C)", dryMethod: "Air dry flat or line dry", ironTemp: "Low (110\u00b0C) if needed", specialNotes: "Coarse, absorbent fiber — avoid prolonged soaking; mats and rope may shed; similar care to jute handicrafts" },
  sano: { washTemp: "Warm (30-40\u00b0C)", dryMethod: "Line dry", ironTemp: "High (200\u00b0C) while damp", specialNotes: "Similar care to linen/nettle; softens considerably with washing; very durable" },
  "river-reed": { washTemp: "Wipe or brush clean", dryMethod: "Air dry", ironTemp: "Do not iron", specialNotes: "Re-soak before re-shaping; naturally insect-resistant; may become brittle with age" },
  igusa: { washTemp: "Vacuum or dry brush", dryMethod: "Air dry; avoid damp storage", ironTemp: "Do not iron", specialNotes: "Natural rush darkens and becomes brittle with age and UV; rotate tatami and limit direct sun; professional replacement when worn" },
  roselle: { washTemp: "Warm (30-40\u00b0C) or spot clean for coarse goods", dryMethod: "Line dry flat", ironTemp: "Medium (150\u00b0C) if needed", specialNotes: "Coarse bast weakens when wet — handle like jute; for blends, follow dominant fiber; rope, nets, and geotextiles are seldom laundered" },
  /* ── TEXTILE CARE DATA ── */
  felt: { washTemp: "Cold hand wash (20°C) or dry clean", dryMethod: "Flat dry; reshape while damp", ironTemp: "Low (110°C) with steam and press cloth", specialNotes: "Do not agitate in water — felt cannot be un-felted; spot clean when possible" },
  denim: { washTemp: "Cold (20-30°C); turn inside-out", dryMethod: "Line dry or tumble low", ironTemp: "High (200°C) while slightly damp", specialNotes: "Wash infrequently to preserve fades; raw denim develops unique wear patterns over 6-12 months" },
  "bamboo-viscose": { washTemp: "Cold to warm (30°C)", dryMethod: "Line dry or tumble low", ironTemp: "Low (110°C)", specialNotes: "Avoid bleach; fabric softener not needed due to natural softness" },
  "viscose-rayon": { washTemp: "Cold hand wash (20°C) or dry clean", dryMethod: "Flat dry; do not wring", ironTemp: "Low (110°C) while damp", specialNotes: "Weakens when wet — handle gently; may shrink if machine washed; iron on reverse" },
  cupro: { washTemp: "Cold hand wash (20°C) or dry clean", dryMethod: "Flat dry in shade", ironTemp: "Low (110°C) with cloth", specialNotes: "Similar care to silk; weakens when wet; excellent drape recovers on drying" },
  muslin: { washTemp: "Warm (30-40°C)", dryMethod: "Line dry or tumble low", ironTemp: "Medium-High (180°C) while damp", specialNotes: "Machine washable for commercial muslin; heritage muslin treated like finest silk" },
  flannel: { washTemp: "Warm (30-40°C)", dryMethod: "Tumble low; remove promptly", ironTemp: "Medium (150°C) with steam", specialNotes: "Pill-prone — wash inside-out; wool flannel may need dry cleaning; avoid high heat" },
};

export const careData: Record<string, CareData> = rawCareData;

/* ═══ QUOTES ═══ */
export interface QuoteEntry {
  text: string;
  attribution: string;
  context?: string;
}

export const quoteData: Record<string, QuoteEntry[]> = {
  /* ── FIBER QUOTES ── */
  hemp: [
    { text: "Long ago when these ancient Grecian temples were new, hemp was already old in the service of mankind.", attribution: "Hemp for Victory (USDA), 1942" },
    { text: "Even the ships that carried Columbus across the Atlantic were rigged with hemp.", attribution: "Hemp for Victory (USDA), 1942" },
    { text: "Why use up the forests which were centuries in the making when there is a substitute available — hemp?", attribution: "Henry Ford, 1941" },
  ],
  jute: [
    { text: "Jute is the golden fiber of Bengal — it clothes the bales that clothe the world.", attribution: "Bengal Proverb" },
    { text: "No other natural fiber packs the combination of strength, versatility, and low cost that jute provides.", attribution: "International Jute Study Group" },
  ],
  "flax-linen": [
    { text: "The history of linen is the history of civilization itself.", attribution: "Patricia Baines, Linen: Hand Spinning and Weaving" },
    { text: "Pure linen cloth, shining white, was the robe of the gods, the dress of the dead, and the badge of the living in ancient Egypt.", attribution: "Elizabeth Barber, Prehistoric Textiles" },
    { text: "Linen wrinkles nobly.", attribution: "Irish Linen Proverb" },
  ],
  "organic-cotton": [
    {
      text: "Cotton is the fabric of our lives — and the foundation of modern civilization.",
      attribution: "Cotton Incorporated",
      context: "Industry tagline reflecting cotton's ubiquity in global textile use",
    },
    {
      text: "Whoever says 'Industrial Revolution' says cotton.",
      attribution: "Eric Hobsbawm, British historian",
      context: "From 'Industry and Empire' (1968), highlighting cotton's central role in 18th-19th century industrialization",
    },
    {
      text: "The history of cotton is the history of capitalism, colonialism, and the global economy.",
      attribution: "Sven Beckert, 'Empire of Cotton' (2014)",
      context: "Acknowledging cotton's complex legacy intertwined with exploitation and trade networks",
    },
    {
      text: "Organic cotton is not just a fiber choice — it's a soil health strategy, a water conservation practice, and a commitment to farmer well-being.",
      attribution: "Textile Exchange, 2025 Organic Cotton Market Report",
      context: "Modern perspective on organic cotton as a holistic agricultural system",
    },
  ],
  silk: [
    { text: "Silk does for the body what diamonds do for the hand.", attribution: "Oscar de la Renta" },
    { text: "According to legend, Empress Leizu discovered silk when a cocoon fell into her tea, and a single filament unwound across her garden.", attribution: "Chinese Tradition, c. 2700 BCE" },
    { text: "The Silk Road was never about silk alone — it was the thread that connected civilizations.", attribution: "Peter Frankopan, The Silk Roads" },
  ],
  bamboo: [
    { text: "Bamboo is not a weed — it is a resource waiting for imagination.", attribution: "Óscar Hidalgo-López" },
    { text: "The hollow stem bends in the storm but does not break — and from it we draw fiber softer than cotton.", attribution: "Chinese Proverb (adapted)" },
  ],
  wool: [
    { text: "God made the country and man made the town, but the devil made the small country town — and wool made them all.", attribution: "Australian Saying" },
    { text: "All the wealth of England rides on the back of the sheep.", attribution: "Medieval English Proverb" },
    { text: "Wool is the only fiber that can be felted, and in that single fact lies a universe of possibility.", attribution: "Beverly Gordon, Feltmaking" },
  ],
  coir: [
    { text: "The coconut palm gives us everything — the fiber from its husk is the humblest gift, and the most enduring.", attribution: "Kerala Proverb" },
    { text: "Coir asks nothing and gives everything: it resists salt, rot, and time itself.", attribution: "Coir Board of India" },
  ],
  sisal: [
    { text: "Sisal was the steel cable of the ancient world — every ship that sailed owed its rigging to plant fiber.", attribution: "Cordage Institute" },
    { text: "Where sisal grows, poverty retreats — it is the poor farmer's anchor crop.", attribution: "East African Agricultural Saying" },
  ],
  ramie: [
    { text: "Ramie is the forgotten fiber — stronger than cotton, more lustrous than linen, and older than either.", attribution: "Irene Emery, The Primary Structures of Fabrics" },
    { text: "By the pond east of the gate, one can ret ramie.", attribution: "Shijing (Book of Songs), Chen Feng" },
    { text: "Chinese grass-cloth is so fine it was once mistaken for silk by European traders.", attribution: "18th-Century Trade Accounts" },
    { text: "The techniques of Echigo-jōfu and Ojiya-chijimi — ramie summer cloth shaped by snow, resist dyeing, and patient handwork — belong to humanity's living heritage.", attribution: "UNESCO Intangible Cultural Heritage" },
    { text: "Southerners do not understand hemp harvest; northerners do not understand ramie processing.", attribution: "Wang Zhen, Agricultural Treatise (Yuan dynasty)" },
  ],
  kapok: [
    { text: "Kapok cannot be spun, but it can save your life — a single pound keeps a man afloat.", attribution: "US Navy Handbook, 1942" },
    { text: "The lightest fiber in the world, kapok floats on water and on air — it is nature's down.", attribution: "Tropical Plant Biology" },
  ],
  pineapple: [
    { text: "Piña cloth is so delicate that it must be woven in the cool hours of dawn, when humidity keeps the fibers supple.", attribution: "Filipino Weaving Tradition" },
    { text: "To wear piña is to wear sunlight caught in fiber.", attribution: "Philippine Textile Heritage" },
    { text: "The barong tagalog, made of piña, is the national dress precisely because it is impossible to conceal a weapon beneath its transparency.", attribution: "Filipino Cultural Saying" },
  ],
  alpaca: [
    { text: "Alpaca fiber is the gold of the Andes — warmer than sheep's wool, softer than cashmere, and stronger than both.", attribution: "Peruvian Textile Tradition" },
    { text: "The Inca reserved the finest alpaca — suri — for royalty; commoners wore llama.", attribution: "Inca Textile Hierarchy" },
  ],
  cashmere: [
    { text: "Cashmere is a whisper against the skin where wool is a conversation.", attribution: "Brunello Cucinelli" },
    { text: "A single cashmere goat yields only 150 grams of down per year — luxury measured in patience.", attribution: "Mongolian Herder Wisdom" },
    { text: "The finest cashmere comes from the harshest winters — adversity makes softness.", attribution: "Changra Goat Herders, Ladakh" },
  ],
  nettle: [
    { text: "In the fairy tale, the princess wove nettle shirts to free her brothers — and in reality, nettle fiber is stronger than linen.", attribution: "Hans Christian Andersen / Textile Science" },
    { text: "The nettle stings only the timid hand; grasp it firmly and it yields a fiber finer than flax.", attribution: "European Herbalist Tradition" },
  ],
  merino: [
    { text: "Merino is to wool what silk is to the caterpillar — the finest expression of a natural miracle.", attribution: "Australian Wool Innovation" },
    { text: "A Merino fleece is so fine that 17 microns of it can regulate your body temperature in any climate on Earth.", attribution: "Icebreaker Textiles" },
  ],
  yak: [
    { text: "On the high plateau, the yak is everything — its down is the warmth that makes life above 4,000 meters possible.", attribution: "Tibetan Nomad Saying" },
    { text: "Yak fiber is khullu — the 'diamond fiber' of the Himalayas.", attribution: "Ladakhi Tradition" },
  ],
  mohair: [
    { text: "Mohair is the diamond fiber — it takes dye like no other natural material and reflects light with a living luster.", attribution: "Mohair South Africa" },
    { text: "An Angora goat's fleece grows one inch per month, and every inch is worth its weight in silver.", attribution: "Texas Hill Country Saying" },
  ],
  qiviut: [
    { text: "Qiviut is the rarest luxury fiber on Earth — shed once a year by muskoxen on the Arctic tundra.", attribution: "Oomingmak Cooperative, Alaska" },
    { text: "Eight times warmer than wool and finer than cashmere, qiviut does not shrink in water — it is born of the Arctic.", attribution: "Muskox Fiber Studies" },
  ],
  vicuna: [
    { text: "The Inca emperor alone wore vicuña — anyone else caught wearing it was put to death.", attribution: "Inca Law" },
    { text: "Vicuña fiber is 12 microns — finer than any sheep's wool — and each animal yields only 200 grams every two years.", attribution: "CITES Conservation Records" },
  ],
  camel: [
    { text: "The Bactrian camel sheds its down in spring in great clumps — the nomad gathers this gift without shearing.", attribution: "Mongolian Herding Tradition" },
    { text: "Camel hair, unpigmented and undyed, is the original 'camel color' — one of fashion's most enduring neutrals.", attribution: "Textile Color History" },
  ],
  bison: [
    { text: "Buffalo down is the lost luxury of the Great Plains — warmer than wool, softer than cashmere, and nearly extinct by 1890.", attribution: "American Bison Society" },
    { text: "We are only beginning to understand what the Plains peoples always knew: the buffalo provides everything, including the finest fiber.", attribution: "Indigenous Textile Revival" },
  ],
  lotus: [
    { text: "From a single stem at Inle Lake, Daw Sa U wove the first Padonma Kyathingan and was blessed as Daw Kyar U — Madam Lotus Egg.", attribution: "Inle Lake lotus-robes tradition" },
    { text: "Lotus silk is not silk at all — it is the extracted vascular fiber of the sacred lotus, as fine as spider web.", attribution: "Myanmar textile tradition" },
    { text: "Extracting enough lotus silk for one scarf can take two months — the cloth can cost many times what ordinary mulberry silk commands.", attribution: "Lotus textile economics" },
    { text: "Samatoa trains Cambodian women in lotus fabric as fair trade — taking the country's natural textiles toward a global audience.", attribution: "Samatoa, Cambodia" },
    { text: "Near Loktak Lake, Bijiyashanti Tongbram named her workshop Sanajing Sana Thambal and taught neighbours to spin lotus thread on bamboo looms.", attribution: "Manipur, India" },
  ],
  seacell: [
    { text: "SeaCell embeds seaweed directly into cellulose fiber — the ocean's minerals become part of the cloth itself.", attribution: "Smartfiber AG" },
    { text: "A fiber that brings the sea to your skin: calcium, magnesium, and vitamin E woven into every thread.", attribution: "Marine Biotextile Research" },
  ],
  chitin: [
    { text: "After cellulose, chitin is the most abundant biopolymer on Earth — every crab shell is a fiber factory.", attribution: "Journal of Biopolymers" },
    { text: "From shrimp waste to surgical thread — chitin fiber turns the ocean's refuse into medicine's suture.", attribution: "Biomaterials Science" },
  ],
  banana: [
    { text: "The banana plant gives us fruit and then gives us fiber — nothing is wasted in the tropical garden.", attribution: "Philippine Agricultural Tradition" },
    { text: "Banana fiber is extracted from the pseudo-stem that would otherwise be discarded — sustainability born from abundance.", attribution: "Green Textile Innovation" },
  ],
  soy: [
    { text: "Henry Ford wore a suit of soy fiber in 1941 and declared the future of textiles was in the field, not the factory.", attribution: "Ford Motor Company Archives" },
    { text: "Soy fiber — the 'vegetable cashmere' — is spun from the protein left over after extracting soybean oil.", attribution: "Azlon Research" },
  ],
  milk: [
    { text: "Milk fiber was first produced in 1930s Italy, when Mussolini sought textile self-sufficiency through casein.", attribution: "Italian Textile History" },
    { text: "Modern milk fiber uses casein protein that would otherwise be dairy waste — the circular economy in a spool.", attribution: "Qmilk GmbH" },
  ],
  corn: [
    { text: "Ingeo — fiber from corn — proves that a field of maize can grow the shirt on your back.", attribution: "NatureWorks LLC" },
    { text: "A renewable fiber from the heartland: corn-based PLA dissolves back into the earth from which it came.", attribution: "Bioplastics Research" },
  ],
  recycled: [
    { text: "Every plastic bottle is a fiber waiting to be reborn — recycled polyester turns waste into wearable purpose.", attribution: "Patagonia Environmental Mission" },
    { text: "The greenest fiber is the one that already exists. Recycling is not an end — it is a beginning.", attribution: "Ellen MacArthur Foundation" },
  ],
  lyocell: [
    { text: "TENCEL is the proof that industrial forestry and ecological responsibility can share the same thread.", attribution: "Lenzing AG" },
    { text: "Closed-loop means 99.7% of the solvent is recovered — making lyocell perhaps the cleanest regenerated fiber on Earth.", attribution: "Textile Research Journal" },
  ],
  "spider-silk": [
    { text: "Spider silk is five times stronger than steel by weight, yet we cannot farm spiders — they eat each other.", attribution: "Fritz Vollrath, Oxford Silk Group" },
    { text: "Golden orb-weaver silk was woven into a cape requiring over a million spiders — the rarest textile ever made.", attribution: "American Museum of Natural History, 2009" },
  ],
  "peace-silk": [
    { text: "Ahimsa silk lets the moth live — the cocoon is cut open after emergence, yielding shorter but karma-free fiber.", attribution: "Kusuma Rajaiah, Inventor of Peace Silk" },
    { text: "To wear peace silk is to choose beauty without death.", attribution: "Ahimsa Philosophy" },
  ],
  "navajo-churro": [
    { text: "The Navajo-Churro is not just a sheep — it is the living foundation of Diné weaving culture.", attribution: "Navajo-Churro Sheep Association" },
    { text: "When Kit Carson killed the Navajo sheep in 1864, he destroyed a textile tradition. When the sheep returned, so did the art.", attribution: "Noel Bennett, Navajo Weaving Scholar" },
  ],
  abaca: [
    { text: "Manila hemp is not hemp at all — it is abacá, and it makes the strongest natural rope the world has ever known.", attribution: "Philippine Fiber Industry Authority" },
    { text: "Japanese yen notes are made from abacá — strong enough to survive a thousand transactions.", attribution: "Currency Paper Manufacturing" },
  ],
  kenaf: [
    { text: "Kenaf grows faster than almost any fiber crop — four meters in five months — and sequesters carbon as it grows.", attribution: "USDA Alternative Crops Research" },
    { text: "A bast fiber that cleans the soil, captures carbon, and produces paper without cutting a single tree.", attribution: "Kenaf International" },
  ],
  milkweed: [
    { text: "Milkweed floss is too slippery to spin alone, but blended into yarn it creates the lightest insulation in nature.", attribution: "Ogallala Comfort Company" },
    { text: "Save the monarchs and harvest the fiber — milkweed serves butterfly and weaver alike.", attribution: "Monarch Watch" },
  ],
  pandan: [
    { text: "The 'ie toga — a fine mat woven from pandanus — is the most valuable object in Samoan culture, worth more than land.", attribution: "Samoan Cultural Heritage" },
    { text: "To weave pandanus is to weave patience — a single fine mat may take a year of daily work.", attribution: "Pacific Island Craft Tradition" },
  ],
  palm: [
    { text: "The palmyra palm gives 801 uses — and its fiber is among the most overlooked.", attribution: "Tamil Proverb" },
    { text: "Coir from coconut, ijuk from sugar palm, raffia from raphia palm — every palm genus offers a distinct fiber.", attribution: "Tropical Fiber Botany" },
  ],
  rambouillet: [
    { text: "The Rambouillet flock was the gift of King Louis XVI to the French nation — royalty distilled into fiber.", attribution: "French Agricultural History" },
    { text: "American Rambouillet built the western wool industry — tough sheep for a tough land.", attribution: "American Sheep Industry Association" },
  ],
  "water-lily": [
    { text: "Extracting fiber from water lily stems is like drawing silk from water — the stems must be processed within hours of cutting.", attribution: "Samatoa Lotus Textiles" },
    { text: "The rarest fiber is the one nobody thought to look for, hiding beneath the surface of a temple pond.", attribution: "Cambodian Artisan Tradition" },
    { text: "A peduncle fiber without a hollow lumen still meets the textile length threshold — morphology and chemistry then argue for composites as much as cloth.", attribution: "Nymphaea rubra fiber characterization literature" },
  ],
  "water-hyacinth": [
    { text: "From invasive to inventive — the same stems that choked the Volta become fiber for the weaver’s loom.", attribution: "Ghana Fair-Trade Cooperative Practice" },
    { text: "They called it the poison flower when the nets came up empty; now the harvest feeds co-ops and craft, not just the weed.", attribution: "Volta River Livelihood Programs" },
    { text: "Slit the hollow stalk, let the sun do the retting — two weeks from weed to spinnable line.", attribution: "South Asian Fiber Extraction Studies" },
  ],
  sano: [
    { text: "Sano fiber has carried fish from Himalayan streams for centuries — stronger wet than dry, like the mountains themselves.", attribution: "Nepali Highland Tradition" },
    { text: "Girardinia diversifolia stings worse than common nettle, but its bast fiber outlasts hemp.", attribution: "Himalayan Ethnobotany" },
  ],
  "river-reed": [
    { text: "Before timber framing, before brick, humanity sheltered under reed — the first architecture was woven.", attribution: "Vernacular Architecture Studies" },
    { text: "A thatched reed roof, properly laid, will outlast a generation — fifty years of rain sliding off bundled stems.", attribution: "Master Thatcher's Guild" },
  ],
  igusa: [
    { text: "Tatami is not only a floor — it measures the room, the light, and the seasons; igusa is the living skin of that measure.", attribution: "Japanese Interior Craft Tradition" },
    { text: "The best rush grows where the water runs clear and cold — the field and the fiber share the same discipline.", attribution: "Japanese Rush-Growing Regions" },
    { text: "A new tatami room smells of summer fields — that is igusa speaking before the house settles into quiet.", attribution: "Japanese Domestic Craft" },
    { text: "The tatami facing hides thousands of parallel decisions: each rush strip aligned so the foot reads smoothness as calm.", attribution: "Tatami Weaving Practice" },
  ],
  /* ── DYE QUOTES ── */
  indigo: [
    { text: "Indigo is the king of dyes — no other substance has shaped trade, politics, and culture so profoundly.", attribution: "Jenny Balfour-Paul, Indigo: Egyptian Mummies to Blue Jeans" },
    { text: "The indigo vat is alive — it must be fed and rested, coaxed and nursed, like a living creature.", attribution: "Japanese Aizome Master" },
    { text: "Blue is the only color that maintains its own character in all its tones — it will always stay blue.", attribution: "Raoul Dufy" },
  ],
  madder: [
    { text: "Turkey Red was the most jealously guarded dye secret in European history — it took industrial espionage to crack it.", attribution: "Robert Chenciner, Madder Red" },
    { text: "Madder root must sleep in the earth for three years before it is ready to give its red — patience is the first mordant.", attribution: "Anatolian Dyer's Saying" },
  ],
  turmeric: [
    { text: "Turmeric dyes the robes of Buddhist monks, the hands of Indian brides, and the cloth of Southeast Asian royalty.", attribution: "Dominique Cardon, Natural Dyes" },
    { text: "The golden color fades in sunlight, but the ceremony it adorned does not — turmeric is a dye for the moment.", attribution: "South Indian Wedding Tradition" },
  ],
  woad: [
    { text: "The ancient Britons painted themselves with woad before battle — the first war paint was a textile dye.", attribution: "Julius Caesar, De Bello Gallico" },
    { text: "Woad is indigo's elder cousin — slower, subtler, and native to every hedgerow in Europe.", attribution: "Jenny Dean, Wild Color" },
  ],
  weld: [
    { text: "Weld is the brightest and most lightfast yellow in the natural dyer's palette — medieval illuminators knew it as 'schüttgelb.'", attribution: "Dominique Cardon, Natural Dyes" },
    { text: "Lincoln green, the color of Robin Hood, was made by over-dyeing weld yellow with woad blue.", attribution: "English Dye History" },
  ],
  logwood: [
    { text: "Logwood gave the world its first affordable black — before it, black cloth was a luxury only the clergy and nobility could afford.", attribution: "Amy Butler Greenfield, A Perfect Red" },
    { text: "English pirates fought Spanish soldiers in the jungles of Belize for the right to cut logwood — a war over color.", attribution: "Colonial Trade History" },
  ],
  "osage-orange": [
    { text: "Before barbed wire, osage orange hedgerows fenced the Great Plains — 'horse-high, bull-strong, and hog-tight.'", attribution: "Kansas Settler Saying" },
    { text: "The Osage bow and the Osage dye came from the same tree — weapon and beauty from a single source.", attribution: "Osage Nation Heritage" },
  ],
  "black-walnut": [
    { text: "Black walnut hulls will stain your hands for weeks — the strongest natural dye you can forage from your own yard.", attribution: "Jenny Dean, Wild Color" },
    { text: "The juglone in walnut hulls is both dye and herbicide — it colors cloth and kills competing plants.", attribution: "Allelopathy in Agriculture" },
  ],
  marigold: [
    { text: "Marigolds are the gateway flower for natural dyers — generous, forgiving, and golden as a summer afternoon.", attribution: "Rebecca Desnos, Botanical Colour at Your Fingertips" },
    { text: "In Mexico, marigolds are cempasúchil — the flower of the dead, dyeing altars gold on Día de Muertos.", attribution: "Mexican Cultural Heritage" },
  ],
  coreopsis: [
    { text: "Coreopsis is the dyer's secret weapon — a common garden flower that yields colors from gold to deep mahogany.", attribution: "Rita Buchanan, A Dyer's Garden" },
    { text: "The tinctoria in Coreopsis tinctoria means 'of the dyers' — even Linnaeus knew this flower was born for the dye pot.", attribution: "Botanical Nomenclature" },
  ],
  pomegranate: [
    { text: "The pomegranate rind — discarded by the cook — is the dyer's treasure: a substantive dye that needs no mordant.", attribution: "Middle Eastern Dye Tradition" },
    { text: "Pomegranate has dyed leather, silk, and wool since ancient Mesopotamia — four thousand years of golden-brown.", attribution: "Ancient Near Eastern Textiles" },
  ],
  cochineal: [
    { text: "When Cortés saw the scarlet robes of Montezuma, he coveted the color more than the gold.", attribution: "Amy Butler Greenfield, A Perfect Red" },
    { text: "It takes 70,000 dried insects to make one pound of cochineal dye — the most labor-intensive colorant ever produced.", attribution: "Natural Dye Chemistry" },
    { text: "Cochineal red was the third most valuable export from the New World, after gold and silver.", attribution: "Colonial Mexican Trade Records" },
  ],
  lac: [
    { text: "The lac insect gives us dye, shellac, and the very word 'lacquer' — one tiny creature, three industries.", attribution: "Indian Lac Research Institute" },
    { text: "Lac scarlet was the red of Mughal court textiles — richer than madder, more accessible than cochineal.", attribution: "Indian Textile Dyeing Tradition" },
  ],
  ochre: [
    { text: "Ochre is the oldest pigment in human history — we painted with it 100,000 years before we wove with fiber.", attribution: "Blombos Cave Archaeological Record" },
    { text: "Red ochre on the body of the dead is found on every inhabited continent — the first universal human ritual.", attribution: "Ian Watts, Ochre in Human Evolution" },
  ],
  "iron-oxide": [
    { text: "Iron is the saddener — add it to any dye bath and the color darkens, deepens, and grows somber.", attribution: "Traditional Dyer's Terminology" },
    { text: "Too much iron eats the cloth — the dyer must balance darkness against destruction.", attribution: "Mordant Chemistry Caution" },
  ],
  shibori: [
    { text: "Shibori is not tie-dye — it is a universe of resist techniques refined over fourteen centuries.", attribution: "Yoshiko Iwamoto Wada, Memory on Cloth" },
    { text: "In shibori, the beauty lies in what the dye cannot reach — absence is the pattern.", attribution: "Japanese Textile Philosophy" },
    { text: "Arashi shibori wraps cloth around a pole like a storm — and the pattern that emerges is rain.", attribution: "Japanese Craft Etymology" },
  ],
  batik: [
    { text: "A woman's skill in batik was once the measure of her refinement — the finest batik took years to complete.", attribution: "Javanese Court Tradition" },
    { text: "The canting — the tiny copper spout that draws wax onto cloth — is the calligrapher's pen of the textile world.", attribution: "Indonesian Textile Arts" },
    { text: "UNESCO recognized Indonesian batik as an Intangible Cultural Heritage of Humanity in 2009.", attribution: "UNESCO Proclamation" },
  ],
  ikat: [
    { text: "In ikat, the pattern exists in the yarn before the cloth is woven — it is the only textile where design precedes structure.", attribution: "John Gillow, World Textiles" },
    { text: "Double ikat — where both warp and weft are pre-dyed — is the Everest of weaving: only five cultures ever mastered it.", attribution: "Textile Research Centre, Leiden" },
  ],
  "avocado-dye": [
    { text: "The most surprising dye in the kitchen is the avocado pit — not green, but a delicate blush pink.", attribution: "Rebecca Desnos, Botanical Colour at Your Fingertips" },
    { text: "Avocado dyeing proves that beauty hides in waste — every discarded pit is a rose waiting to bloom on cloth.", attribution: "Zero-Waste Dye Movement" },
  ],
  annatto: [
    { text: "Annatto colors the robes of indigenous Amazonian peoples, the cheese of European dairies, and the lipstick on your shelf.", attribution: "Ethnobotany of the Amazon" },
    { text: "The Aztecs mixed annatto with cocoa to create the first 'hot chocolate' — it was a drink of color as much as flavor.", attribution: "Pre-Columbian Food History" },
  ],
  "onion-skins": [
    { text: "Onion skins are the most accessible natural dye on Earth — save your kitchen scraps and you have a dye studio.", attribution: "India Flint, Eco Colour" },
    { text: "The color of onion-skin gold is the color of autumn itself — warm, rich, and gently fading.", attribution: "Natural Dye Poetry" },
  ],
  cutch: [
    { text: "Cutch has tanned leather, dyed sails, and preserved fishing nets for three thousand years across the Indian Ocean world.", attribution: "Indian Ocean Trade History" },
    { text: "Sailors called it 'catechu' — the brown that waterproofed their canvas and colored their world.", attribution: "Maritime Textile Tradition" },
  ],
  bloodroot: [
    { text: "The Algonquin called it 'poughkone' and used its red sap for dye, paint, and medicine — a plant of triple purpose.", attribution: "Indigenous Ethnobotany" },
    { text: "Bloodroot bleeds when cut — a vivid red-orange sap that stains everything it touches, including time.", attribution: "Eastern Woodland Herbalism" },
  ],
  brazilwood: [
    { text: "Brazil was named after a tree, not the other way around — 'pau-brasil' was so valuable it named a nation.", attribution: "Colonial Portuguese History" },
    { text: "The pernambuco bow of a concert violinist is made from the same wood that once dyed the robes of European kings.", attribution: "Luthier Tradition" },
  ],
  fustic: [
    { text: "Fustic was the most traded dye wood of the colonial Americas — ships returned to Europe with holds full of golden heartwood.", attribution: "Caribbean Trade Records" },
    { text: "Old fustic for yellow, logwood for black, brazilwood for red — three trees built the color economy of the New World.", attribution: "Colonial Dye Trade History" },
  ],
  "oak-bark": [
    { text: "Oak bark tanned the leather of Roman legions and medieval knights — and it still tans the finest leather made today.", attribution: "J & FJ Baker, England's Last Bark Tannery" },
    { text: "The tannin in oak bark is the molecule that makes leather possible — without it, skin rots instead of enduring.", attribution: "Leather Chemistry" },
  ],
  alder: [
    { text: "Alder bark dyes wool the color of autumn earth — a rust-brown so natural it seems to grow from the fiber.", attribution: "Scandinavian Folk Dye Tradition" },
    { text: "Viking textiles were often dyed with alder bark — the warm brown of Norse cloth was the color of the northern forest.", attribution: "Norse Archaeological Textiles" },
  ],
  "tea-dye": [
    { text: "Tea-staining fabric is alchemy for the everyday — a cup of tea can age new cloth by a century.", attribution: "Quilter's Tradition" },
    { text: "The tannin in tea is the same chemistry that tans leather — every cup is a tiny dye bath.", attribution: "Tea Chemistry" },
  ],
  dahlia: [
    { text: "Dahlias were first cultivated by the Aztecs — not for their flowers, but for their edible tubers and dyeable petals.", attribution: "Pre-Columbian Horticulture" },
    { text: "A single dahlia garden can supply a dyer's palette from pale yellow to burnt sienna.", attribution: "Rita Buchanan, A Dyer's Garden" },
  ],
  safflower: [
    { text: "Safflower was ancient Egypt's rouge — Cleopatra's red lips may have been colored by carthamin.", attribution: "Egyptian Cosmetics History" },
    { text: "Japanese beni — safflower red — required washing the petals hundreds of times to separate yellow from precious red.", attribution: "Japanese Cosmetic Tradition" },
  ],
  elderberry: [
    { text: "Elderberry juice stains everything it touches — fingers, cloth, and memory.", attribution: "Forager's Observation" },
    { text: "The elder tree is the medicine chest of the hedgerow, and its berries dye yarn the color of twilight.", attribution: "European Folk Tradition" },
  ],
  blackberry: [
    { text: "Every forager knows: blackberry juice on a white shirt is a dye that no laundry can undo.", attribution: "Universal Experience" },
    { text: "The muted purple-gray of blackberry dye is the color of late summer — fleeting and melancholy.", attribution: "Natural Dye Aesthetics" },
  ],
  "mushroom-dyes": [
    { text: "Miriam Rice proved that mushrooms could dye every color of the rainbow — and mycologists became artists.", attribution: "International Mushroom Dye Institute" },
    { text: "Dermocybe sanguinea — the blood-red webcap — dyes wool a crimson that rivals cochineal.", attribution: "Fungal Pigment Research" },
  ],
  "mollusk-purple": [
    { text: "Tyrian purple was worth its weight in silver — ten thousand murex snails yielded one gram of dye.", attribution: "Pliny the Elder, Natural History" },
    { text: "The purple of emperors and cardinals was made from rotting sea snails — glory born from stench.", attribution: "Mediterranean Dye Archaeology" },
    { text: "Only God can make purple — that was the belief, and so only kings could wear it.", attribution: "Sumptuary Law Tradition" },
  ],
  "clay-pigments": [
    { text: "In Mali, the earth itself is the dye — bògòlanfini mud cloth turns river clay into cultural identity.", attribution: "Sarah Brett-Smith, Bamana Mud Cloth" },
    { text: "The women of Beledougou have fermented the same river mud for generations — it is alive with chemistry.", attribution: "Malian Textile Heritage" },
  ],
  "oak-galls": [
    { text: "Iron gall ink wrote the Magna Carta, the Declaration of Independence, and the manuscripts of Leonardo da Vinci.", attribution: "Conservation Science" },
    { text: "An oak gall is a wasp's nursery hijacked by chemistry — tannin, iron, and time produce the blackest of blacks.", attribution: "Medieval Ink Making" },
  ],
  chlorophyll: [
    { text: "The green of chlorophyll is the most abundant pigment on Earth — yet it remains one of the least lightfast dyes.", attribution: "Natural Dye Chemistry" },
    { text: "Stabilizing chlorophyll for textiles required copper — turning leaf-green into a permanent, washable color.", attribution: "Green Chemistry Research" },
  ],
  henna: [
    { text: "Henna has adorned hands for 5,000 years — the oldest cosmetic dye in continuous use.", attribution: "Catherine Cartwright-Jones, Henna's Secret History" },
    { text: "Lawsone, the dye molecule in henna, bonds permanently to keratin — the stain grows out, it never washes off.", attribution: "Henna Chemistry" },
  ],
  "solar-dyeing": [
    { text: "Solar dyeing is the patience method — let the sun do the work, and the color will come in its own time.", attribution: "Slow Textile Movement" },
    { text: "A jar of marigolds and sunlight for a week produces color as rich as any simmer — the sun is a gentle alchemist.", attribution: "Solar Dye Practice" },
  ],
  "tie-dye": [
    { text: "Tie-dye is older than the Summer of Love by several thousand years — resist dyeing is an ancient human instinct.", attribution: "Textile Archaeology" },
    { text: "The spiral tie-dye of a Grateful Dead shirt and the plangi of Indonesian ceremonial cloth share the same physics.", attribution: "Cross-Cultural Textile Studies" },
  ],
  /* ── TEXTILE QUOTES ── */
  felt: [
    { text: "Felt is the only textile that requires no loom, no needles, and no thread — just fiber, water, and the work of human hands.", attribution: "Beverly Gordon, Feltmaking" },
    { text: "The yurt is architecture woven from sheep — felt walls, felt floors, felt doors against the steppe wind.", attribution: "Mongolian Nomadic Tradition" },
    { text: "Nuno felting transforms gossamer silk into sculptured texture — wool and silk married by friction.", attribution: "Polly Stirling, Contemporary Feltmaker" },
  ],
  denim: [
    { text: "Blue jeans are the most worn garment on Earth — democracy in textile form.", attribution: "Alice Harris, The Blue Jean" },
    { text: "Raw denim is a canvas that your body paints — every fade is autobiography written in indigo.", attribution: "Japanese Selvedge Culture" },
    { text: "Levi Strauss didn't invent jeans — he invented the idea that workwear could outlast the work.", attribution: "American Fashion History" },
  ],
  jacquard: [
    { text: "The Jacquard loom's punched cards were the first binary programs — every brocade is a computed image.", attribution: "James Essinger, Jacquard's Web" },
    { text: "Before Jacquard, a draw boy sat above the loom pulling threads — after Jacquard, a machine read cards. Computing began with cloth.", attribution: "Ada Lovelace's Observation" },
  ],
  tapestry: [
    { text: "A tapestry is a painting in thread — but it outlasts any canvas by centuries.", attribution: "Thomas P. Campbell, Metropolitan Museum of Art" },
    { text: "The Bayeux Tapestry is not a tapestry — it is embroidery. But its name endures because 'tapestry' means 'story told in textile.'", attribution: "Medieval Textile Scholarship" },
    { text: "At the Gobelins manufactory, a weaver produces one square meter of tapestry per year. Time is the hidden thread.", attribution: "Manufacture des Gobelins, Paris" },
  ],
  lace: [
    { text: "A single collar of Venetian needle lace could cost more than a merchant's house — luxury measured in knots per centimeter.", attribution: "Santina Levey, Lace: A History" },
    { text: "To make bobbin lace is to conduct an orchestra of threads — each bobbin a musician, each crossing a note.", attribution: "Bruges Lace School" },
  ],
  knitting: [
    { text: "Properly practiced, knitting soothes the troubled spirit — and it doesn't hurt the untroubled spirit either.", attribution: "Elizabeth Zimmermann, Knitting Without Tears" },
    { text: "The stocking frame did not kill hand knitting; it proved that even socks could be an industry.", attribution: "Textile Industrial History" },
    { text: "A knit fabric is a reservoir of air — warmth is the architecture of loops.", attribution: "Knitwear Design Practice" },
  ],
  carpet: [
    { text: "A Persian carpet is a garden you can roll up and carry — paradise woven in wool and silk.", attribution: "Persian Cultural Saying" },
    { text: "Hand-knotted carpets contain more knots per square inch than pixels in a photograph — each one tied by hand.", attribution: "Oriental Rug Society" },
    { text: "To step on a fine carpet is to walk on a year of someone's life.", attribution: "Turkish Weaver's Proverb" },
  ],
  spinning: [
    { text: "Spinning is the mother of all textiles — without yarn there is no cloth, without cloth there is no civilization.", attribution: "Elizabeth Wayland Barber, Women's Work" },
    { text: "The spinning jenny didn't just make yarn faster — it made the Industrial Revolution possible.", attribution: "Economic History" },
  ],
  "cable-knit": [
    { text: "Aran cable patterns were never family identifiers — that's romantic myth. But the myth itself is now part of the tradition.", attribution: "Alice Starmore, Aran Knitting" },
    { text: "A cable knit uses 30% more yarn than stockinette — that extra yarn is pure warmth and windproofing.", attribution: "Knitting Engineering" },
  ],
  "block-print": [
    { text: "A master block carver in Jaipur spends a lifetime perfecting the art of cutting teak into flowers.", attribution: "Anokhi Museum of Hand Printing" },
    { text: "Each stamp of the block is a prayer — the printer must align perfectly with the ghost of the previous impression.", attribution: "Ajrakh Block Printing Tradition" },
    { text: "India's hand block-printed textiles once clothed the world — European mills had to ban their import to protect local industry.", attribution: "Giorgio Riello, Cotton: The Fabric that Made the Modern World" },
  ],
  twill: [
    { text: "Twill's diagonal line is the geometry of drape — the float that gives cloth its fall.", attribution: "Textile Structure Analysis" },
    { text: "From denim to gabardine, from flannel to drill — twill is the structure that built workwear, suiting, and military uniforms.", attribution: "Weave Structure Encyclopedia" },
  ],
  "plain-weave": [
    { text: "Plain weave is the most honest structure — every thread is held by every other, nothing hides.", attribution: "Anni Albers, On Weaving" },
    { text: "The oldest known woven textile is plain weave from Çatalhöyük — 9,000 years old, and the structure hasn't improved.", attribution: "Textile Archaeology" },
  ],
  satin: [
    { text: "Satin's luster comes from long floats that catch light — the beauty is structural, not chemical.", attribution: "Weave Structure Analysis" },
    { text: "Chinese silk satin was so prized in medieval Europe that 'satin' became a synonym for luxury itself.", attribution: "Silk Road Trade History" },
  ],
  muslin: [
    { text: "Dhaka muslin was so fine it was called 'woven air' — a sari could pass through a finger ring.", attribution: "Bengali Textile Heritage" },
    { text: "The British destroyed India's muslin industry to protect Lancashire cotton — the first act of industrial textile warfare.", attribution: "Sven Beckert, Empire of Cotton" },
    {
      text: "Jamdani* is a Persian word. Jam means flower in Farsi language. Dani means container. The idea was that, because this [fabric] is very transparent, when the woman wears it, with the patterns on her body, she looks like flowers in a container.",
      attribution: "Saiful Islam, Artist / Bengal Muslin",
    },
    {
      text: "I talked to many researchers and craftsmen, and realized that there hasn't been much research done on this famed piece of fabric. This isn't just a fabric for us, it is our culture and history, and the knowledge about it is at the risk of becoming obsolete.",
      attribution: "Saiful Islam, head of Bengal Muslin, to Rafi Hossain, The Daily Star",
    },
    {
      text: "The trade was built up and destroyed by the British East India Company. They really put a stranglehold on its production and came to control the whole trade.",
      attribution: "Sonia Ashmore, author of Muslin, BBC Future",
    },
  ],
  flannel: [
    { text: "Welsh flannel warmed the miners, the shepherds, and the babies — soft cloth for hard lives.", attribution: "Welsh Textile History" },
    { text: "Flannel is napped on both sides — that brushed surface traps air and creates warmth from structure alone.", attribution: "Textile Finishing Science" },
  ],
  velvet: [
    { text: "Velvet was the fabric of thrones — its pile absorbed light and gave depth to every color it carried.", attribution: "Renaissance Textile Trade" },
    { text: "To weave velvet, you weave two cloths face to face and cut them apart — each half receives its pile from the other.", attribution: "Velvet Weaving Technique" },
  ],
  "bamboo-viscose": [
    { text: "Bamboo viscose promises the forest and delivers the chemistry lab — the truth lies between the marketing and the molecule.", attribution: "FTC Textile Fiber Guidelines" },
    { text: "The softness is real, even if the process is chemical — bamboo viscose remains one of the most comfortable fibers against skin.", attribution: "Consumer Textile Testing" },
  ],
  "viscose-rayon": [
    { text: "Viscose was 'artificial silk' — the first time humanity recreated a luxury fiber from wood pulp and chemistry.", attribution: "Textile Innovation History" },
    { text: "Count Hilaire de Chardonnet exhibited his artificial silk at the Paris Exposition of 1889 — and the crowd gasped.", attribution: "French Textile Innovation" },
  ],
  cupro: [
    { text: "Cupro is made from cotton linter — the fuzz too short to spin, reborn as a fabric that drapes like silk.", attribution: "Bemberg by Asahi Kasei" },
    { text: "A waste product from the cotton gin becomes a luxury lining — cupro is the circular economy avant la lettre.", attribution: "Regenerated Fiber History" },
  ],
  dobby: [
    { text: "Dobby is Jacquard's little brother — simpler, faster, and responsible for every Oxford shirt and waffle towel you own.", attribution: "Weaving Technology" },
    { text: "The dobby boy who once sat atop the loom is gone, but his name lives on in every small-figured cloth.", attribution: "Textile Etymology" },
  ],
  "leno-weave": [
    { text: "Leno weave twists warp threads around each other — the only weave structure where the warp itself creates stability.", attribution: "Weave Structure Analysis" },
    { text: "Egyptian mummy wrappings are leno weave — open enough to let the spirit pass, yet strong enough to hold for millennia.", attribution: "Archaeological Textile Studies" },
  ],
  /* ── MISSING FIBER QUOTES ── */
  modal: [
    { text: "Modal is beech wood reborn — the same forest that gives us timber gives us a fiber softer than cotton.", attribution: "Lenzing AG" },
    { text: "Where viscose wrinkles, modal recovers — it is the regenerated fiber that finally learned to hold its shape.", attribution: "Textile Performance Testing" },
  ],
  cork: [
    { text: "The cork oak gives its bark without dying — every harvest is a gift from a living tree.", attribution: "Portuguese Cork Association" },
    { text: "Cork fabric is waterproof, fireproof, and as soft as leather — nature's answer to synthetic materials.", attribution: "Sustainable Materials Research" },
  ],
  llama: [
    { text: "The llama carried Inca civilization on its back and clothed it in its fiber — beast of burden and fiber source in one.", attribution: "Andean Pastoral Tradition" },
    { text: "Llama fiber lacks lanolin, making it hypoallergenic — a gentle warmth for sensitive skin.", attribution: "South American Fiber Arts" },
  ],
  henequen: [
    { text: "Henequen made Yucatán the richest state in Mexico — 'green gold' spun from agave leaves.", attribution: "Yucatecan Industrial History" },
    { text: "Before synthetic twine, henequen bound the harvests of the world — every bale of hay owed its tie to this fiber.", attribution: "Cordage Trade History" },
  ],
  fique: [
    { text: "Fique is Colombia's national fiber — woven into everything from coffee sacks to alpargatas.", attribution: "Colombian Agricultural Heritage" },
    { text: "The agave of the Andes: fique grows where nothing else will, on steep slopes above 1,500 meters.", attribution: "Andean Fiber Botany" },
  ],
  horsehair: [
    { text: "Horsehair gives a suit its shape — the invisible canvas between wool and lining that defines tailoring.", attribution: "Savile Row Tradition" },
    { text: "A violin bow without horsehair is a stick — 150 hairs, precisely tensioned, make music possible.", attribution: "Luthier Craft" },
  ],
  esparto: [
    { text: "Esparto grass made the finest paper in Europe — banknotes, bibles, and certificates printed on woven steppe.", attribution: "Spanish Papermaking Tradition" },
    { text: "Roman sandals were soled with esparto — the grass that walked an empire.", attribution: "Mediterranean Material Culture" },
  ],
  sweetgrass: [
    { text: "Sweetgrass is braided, never cut with metal — the first blade is for Mother Earth, the second for the basket.", attribution: "Wabanaki Basketmaking Tradition" },
    { text: "The vanilla scent of sweetgrass is coumarin — a molecule that perfumes the basket and purifies the ceremony.", attribution: "Robin Wall Kimmerer, Braiding Sweetgrass" },
  ],
  raffia: [
    { text: "Raffia is the widest natural fiber — a single palm leaf yields ribbons meters long and centimeters wide.", attribution: "Tropical Fiber Botany" },
    { text: "In Madagascar, raffia cloth is the shroud of ancestors — the most sacred textile is woven from palm.", attribution: "Malagasy Funeral Tradition" },
  ],
  loofah: [
    { text: "The loofah is not a sea sponge — it is a gourd, dried and stripped to reveal nature's perfect scrubbing mesh.", attribution: "Common Botanical Misconception" },
    { text: "A single loofah vine can produce a dozen gourds — renewable, compostable, and free from any factory.", attribution: "Sustainable Household Materials" },
  ],
  columbia: [
    { text: "The Columbia was America's first homegrown breed — Lincoln crossed with Rambouillet on the Western range.", attribution: "USDA Sheep Breeding Records, 1912" },
    { text: "A dual-purpose sheep for a dual-purpose land — meat and wool from the same open range.", attribution: "American Range Sheep Industry" },
  ],
  corriedale: [
    { text: "Corriedale is the spinner's sheep — forgiving to draft, eager to felt, and beautiful to dye.", attribution: "Hand Spinners' Guild" },
    { text: "New Zealand built its wool industry on the Corriedale cross — Merino fineness with longwool hardiness.", attribution: "New Zealand Wool Board" },
  ],
  romney: [
    { text: "Romney wool sheds rain on the sheep's back — the marshes of Kent bred a fiber that laughs at water.", attribution: "Romney Marsh Shepherds" },
    { text: "The lustrous lock of a Romney fleece spins into a yarn that glows — halfway between wool and mohair.", attribution: "Longwool Breeds Society" },
  ],
  lincoln: [
    { text: "Lincoln fleece hangs in lustrous ringlets nearly a foot long — the heaviest, longest wool in the world.", attribution: "Lincoln Longwool Sheep Breeders' Association" },
    { text: "Lincoln wool is so lustrous it was mistaken for mohair — the 'diamond of the sheep world.'", attribution: "Heritage Breed Conservation" },
  ],
  tussar: [
    { text: "Tussar silk is wild silk — its golden color comes from the forest leaves the worm eats, and it cannot be bleached white.", attribution: "Indian Silk Board" },
    { text: "The beauty of tussar is its imperfection — nubby, textured, and warm where mulberry is smooth and cool.", attribution: "Wild Silk Research" },
    { text: "Tasar, eri, and muga are India’s vanya silks — non-mulberry wild silks with deep roots in tribal and rural sericulture.", attribution: "Indian Sericulture" },
  ],
  ayate: [
    { text: "The tilma of Juan Diego, on which Our Lady of Guadalupe appeared in 1531, was woven from maguey ayate.", attribution: "Mexican Catholic Tradition" },
    { text: "Ayate starts rough and finishes soft — the more you use it, the more it gives.", attribution: "Mexican Market Wisdom" },
  ],
  krajood: [
    { text: "Krajood weaving is a GI-protected craft — each geometric pattern carries the identity of its southern Thai village.", attribution: "Thailand GI Registration" },
    { text: "The sedge grows in standing water and is woven on the floor — krajood comes from water and returns to earth.", attribution: "Nakhon Si Thammarat Craft Heritage" },
  ],
  seagrass: [
    { text: "Seagrass meadows capture carbon 35 times faster than tropical rainforests — every rug is a carbon sink.", attribution: "Marine Ecology Research" },
    { text: "A fiber that grows in saltwater, needs no fertilizer, and develops a golden patina with age — seagrass asks nothing.", attribution: "Sustainable Fiber Innovation" },
    { text: "Thanh Hoa's coastal belt moves tens of thousands of tons a year — the grade the weaving trade measures others against.", attribution: "Vietnam Coastal Supply Chains" },
  ],
};

/** Ordered plate types for the detail-mode storytelling arc. */
export const namedPlates: PlateType[] = [
  "about",
  "properties",
  "insight1",
  "insight2",
  "insight3",
  "silkCharmeuse",
  "silkHabotai",
  "silkDupioni",
  "silkTaffeta",
  "silkChiffon",
  "silkOrganza",
  "quote",
  "youtubeEmbed",
  "trade",
  "worldNames",
  "regions",
  "process",
  "anatomy",
  "care",
  "seeAlso",
];

/* ══════════════════════════════════════════════════════════
   Derived: slim browse-mode index
   Computed once from the full fibers array — no hand-maintained
   duplicate. Only the fields needed by ProfileCard + grid search.
   ══════════════════════════════════════════════════════════ */

import { fibers } from "./fibers";

export const fiberIndex: FiberIndexEntry[] = fibers.map((f) => ({
  id: f.id,
  name: f.name,
  image: f.image,
  status: f.status ?? "published",
  category: f.category,
  tags: f.tags,
  profilePills: f.profilePills,
}));

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

/** Look up multilingual names for a fiber by ID. */
export function getWorldNames(id: string): string[] {
  return worldNames[id] ?? [];
}

/* ══════════════════════════════════════════════════════════
   Gallery data — merged from gallery-data.ts
   Hydrated onto each fiber's galleryImages field at init.
   ══════════════════════════════════════════════════════════ */

function img(
  url: string,
  title?: string,
  attribution?: string,
  orientation?: "portrait" | "landscape",
): GalleryImageEntry {
  return { url, title, attribution, orientation };
}

const galleryMap: Record<string, GalleryImageEntry[]> = {
  /* ── Bast Fibers ── */
  hemp: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619082/atlas/rki8swhrri03gmtjacrm.jpg", "Hemp fiber close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619069/atlas/o5brgx3sqnnwbd7re1ic.jpg", "Raw hemp stalks", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619070/atlas/dnpcv9iks9nn64cpcbuh.jpg", "Hemp processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771633173/atlas/mlapck15btekiyb9wwmi.jpg", "Hemp field"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619073/atlas/yta1tistuaszfx9peetu.jpg", "Hemp fiber bundle"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619075/atlas/jdsr2nwfbfgyfimudrff.jpg", "Hemp rope texture"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619067/atlas/uktcb2if8u7z0eoaqdrz.jpg", "Hemp cultivation"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619080/atlas/uhtds8mgv6pw3fcgetvd.png", "Hemp uses diagram"),
  ],
  jute: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619095/atlas/iwpky4ruxdodh64nldsc.jpg", "Jute fiber processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619097/atlas/ytnsyiolzlaesqw7r3os.jpg", "Raw jute fibers"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619092/atlas/nepjatyfyca2jmoxycdz.jpg", "Jute cultivation"),
  ],
  "flax-linen": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771539245/vpznodascnuqzj8xptd8.jpg", "Flax linen fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619089/atlas/gaggmu9ccig2plu26vue.jpg", "Flax plant field"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619086/atlas/aiwfp2jfeixwvm88za9t.jpg", "Flax fiber extraction"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619085/atlas/c5bij9fpoikcxwuppbjh.jpg", "Linen textile weave"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619091/atlas/semplekcxck2jlsjfxpr.jpg", "Flax seed pod"),
  ],
  "organic-cotton": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771660007/atlas/pmkztjyyr8keuydhjssm.jpg", "Cotton boll close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771659941/atlas/hrgf79vpomknr6inlwdq.jpg", "Organic cotton field"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_23,y_17,w_1036,h_777/v1771537794/tui0czwsd4oxaijakgjc.jpg", "Cotton harvest"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771660006/atlas/mvbslovsxxugwegpoicw.jpg", "Cotton fiber detail"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619114/atlas/va8nncvnzc65qfgwco6n.jpg", "Cotton processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619112/atlas/axkjtbopklxq0zm9fvxv.jpg", "Cotton ginning"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771722544/atlas/oft4lmrqtez1m59vm4ec.jpg", "Gossypium hirsutum", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771660008/atlas/yanuymnwnlebqqfyvicd.jpg", "Cotton bolls on plant"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771660004/atlas/beoh4kfn3bvfwnihfknb.jpg", "Organic cotton fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771722542/atlas/hafsv5yualbb3ll565kh.jpg", "Upland cotton botanical illustration", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771722543/atlas/fcifbs3kwm9fzmj8df7a.jpg", "Dried upland cotton plant", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771722544/atlas/oaqqgzisdiexk6ubzbgh.jpg", "Cotton plant", "ChriKo, CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771660005/atlas/ih3flp0yphetbxnlxu2n.png", "Cotton fiber varieties"),
  ],
  silk: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771645646/atlas/fg2czrebuvxoinpqedtp.jpg", "Silk thread close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619261/atlas/yksbwtxethsok4bxsoix.jpg", "Silk cocoons"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619272/atlas/bwyoiumzmx5d2kqhvsnz.jpg", "Peace silk"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619274/atlas/u54xnyn30xhvcs7pgqxq.jpg", "Tussar silk"),
  ],
  tussar: [
    img(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Cocoons_of_Tasar_Silkworm.jpg/1920px-Cocoons_of_Tasar_Silkworm.jpg",
      "Tasar silkworm cocoons",
      "Wikimedia Commons",
    ),
    img(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Tussar_Silk_Moth_Caterpillar_-_Antheraea_mylitta_%288240520369%29.jpg/1920px-Tussar_Silk_Moth_Caterpillar_-_Antheraea_mylitta_%288240520369%29.jpg",
      "Tussar silkworm caterpillar (Antheraea mylitta)",
      "Wikimedia Commons",
    ),
    img(
      "https://upload.wikimedia.org/wikipedia/commons/a/ae/Tussar_Silk_Moth_Caterpillar_Antheraea_mylitta_yellow_form._%288241589542%29.jpg",
      "Tussar caterpillar, yellow form (Antheraea mylitta)",
      "Wikimedia Commons",
    ),
    img(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Tussar-Silk-Moth.jpg/1920px-Tussar-Silk-Moth.jpg",
      "Tussar silk moth (adult)",
      "Wikimedia Commons",
    ),
    img(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Tasar_Silkworm.jpg/1920px-Tasar_Silkworm.jpg",
      "Tasar silkworm",
      "Wikimedia Commons",
    ),
    img("https://upload.wikimedia.org/wikipedia/commons/d/dc/Tussar_Fabrics.jpg", "Tussar silk fabrics", "Wikimedia Commons"),
    img(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Tussar_insects_weaving_up_picture.jpg/1920px-Tussar_insects_weaving_up_picture.jpg",
      "Tussar silk production",
      "Wikimedia Commons",
    ),
    img(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Ghicha_Tasar_Yarn.jpg/1920px-Ghicha_Tasar_Yarn.jpg",
      "Ghicha tasar yarn",
      "Wikimedia Commons",
    ),
    img(
      "https://inaturalist-open-data.s3.amazonaws.com/photos/612911/original.jpg",
      "Wild silkmoth (Antheraea)",
      "iNaturalist",
    ),
  ],
  bamboo: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619174/atlas/fru5la7c6aitgta2i5f8.jpg", "Bamboo grove"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619174/atlas/mbom8cy4rmsfosndtfop.jpg", "Bamboo fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619175/atlas/v3hdyhfhug91ajiey75m.jpg", "Bamboo textile"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619290/atlas/pjdkdgoxrrz5u2qwusdz.jpg", "Bamboo viscose"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771749992/atlas/jvnkfstlnqqeahamdog3.jpg", "Bamboo stalks"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771749994/atlas/jkjzi7ymzlfrt4ypwufb.jpg", "Bamboo forest"),
  ],
  wool: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619184/atlas/xbtkwreyjuogrzymhkib.jpg", "Raw sheep wool"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619186/atlas/drexoxrl6qgqm3uchmlg.jpg", "Wool fiber close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619187/atlas/emivlmjdqsk66u2qhji8.jpg", "Sheep shearing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771657863/atlas/gegjkntl1jdwbktwtxji.jpg", "Wool spinning"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619188/atlas/br5oyf2xfogdzeosru9s.jpg", "Merino wool"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619189/atlas/vhxmkgun6gmaeg6nzhbs.jpg", "Fine merino fleece"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619190/atlas/av8tbuy1pd3bkqf7nyd7.jpg", "Merino fiber detail"),
  ],
  coir: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771538775/lmgulrcokuc0ixdd40if.jpg", "Coir fiber bundle"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619179/atlas/gqmq3eb0thehhoxu7mkm.jpg", "Coconut husk processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771538716/qumlyrendrghvi76m1xr.jpg", "Coir rope"),
  ],
  sisal: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746447/atlas/suwdp1lxvsm5yvsydj4d.jpg", "Sisal fibers drying, Kenya", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_69,y_19,w_882,h_602/v1771746642/atlas/wglux5xuxrdvp3g7mu9u.jpg", "Sisal plant close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619146/atlas/yobmizwki6grlddpdlx4.jpg", "Sisal fiber texture"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746446/atlas/k7wtevjwuygt9xjmgdin.jpg", "Sisal plant leaves", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746449/atlas/k2nlicabre0aplxfxryj.jpg", "Sisal field", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746450/atlas/hfxf6by6kdtzjngaxxd3.jpg", "Sisal fields in Tanzania", "Joachim Huber, CC BY-SA 2.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746647/atlas/wnukb33o1lcsdri3e0wm.jpg", "Sisal fiber processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746652/atlas/smrxzs306mqx6ju5skt0.jpg", "Sisal in the wild"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746643/atlas/isqdqjlvfurctzsmq8ah.jpg", "Sisal plantation panorama", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746450/atlas/nnmdkm9ts6pkcx7zbpq6.jpg", "Boy spinning sisal, Java", "CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746451/atlas/sk5xadxhurp0lfjn5lnu.jpg", "Sisal factory processing", "CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746452/atlas/kirdzyrnubqqf71mdn0l.jpg", "Sisal drying, Brazil", "Acilondioliveira, CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_0,y_0,w_1200,h_743/v1771746453/atlas/dkad6lpurjbkvcb3prrl.webp", "Sisal rope weaving"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746454/atlas/jvadpkc8baxjxxhanpbs.jpg", "Sisal cultivation, Tanganyika", "Public domain"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746644/atlas/o5txpwp1lufccesu6f0l.jpg", "Sisal fiber wholesale"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746645/atlas/haw0dg5j1txdrhfhqbhz.jpg", "Sisal fiber harvest"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746646/atlas/pqem8lpla3fcmyikbj4g.jpg", "Golden sisal fibers"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746646/atlas/pulythymckf9ibfqg8jm.jpg", "Sisal long fiber bundle", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746648/atlas/urbbnrrwd3jgzjp1f5kn.jpg", "Sisal fiber semi-combed", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746649/atlas/akhuxfbcnarziea7urds.jpg", "Sisal fibre close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746650/atlas/elh0zli5mdhhde50fftt.jpg", "Sisal natural fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746651/atlas/oro04ekjcn6nxuhyndis.jpg", "Sisal fiber processing overview"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746649/atlas/lgxrgcbwc3vbtctj81xw.jpg", "Sisal weave texture"),
  ],
  ramie: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619101/atlas/zjnehkg1uphhf6reyrjx.jpg", "Ramie fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_0,y_0,w_790,h_755/v1771619103/atlas/oiiebhob1fuaethvjfhd.jpg", "Ramie plant"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619104/atlas/ximcswutj743kuvcxizg.jpg", "Ramie textile"),
  ],
  kapok: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723041/atlas/bymapkiz4ietts4t7eki.jpg", "Kapok fiber filling"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723035/atlas/n4eo2tcqe1tto3oazhsh.jpg", "Kapok seed pods"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723037/atlas/qzojfabdpwowzoywbhin.jpg", "Kapok fiber close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723043/atlas/axe5atqmtswjlujv6km6.jpg", "Kapok pillow filling"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723039/atlas/slelcrvpywztgc3pdil1.jpg", "Kapok tree"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723042/atlas/boqoj61dd5qwqdlszigi.jpg", "Kapok harvest"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723038/atlas/zfkwgh49vec3smxgcbuz.jpg", "Kapok raw material"),
  ],
  pineapple: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619124/atlas/w1yt5po5mcws4zgrtjfs.png", "Piña fiber extraction"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619126/atlas/z6dp7jzl5zqiy3ggsluu.jpg", "Piña cloth weaving"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619132/atlas/dauat7oh467mzocnxz9n.jpg", "Pineapple leaf fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619133/atlas/qh0axevmwsjjnmj4ntpj.png", "Piña textile detail"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619142/atlas/z8mlybczh2qstlrcxmoz.jpg", "Barong Tagalog piña"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619129/atlas/blrg9dqpridqzw3umb2r.jpg", "Piña fiber threads"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619138/atlas/t2tpq3tenfdhswlttzos.jpg", "Piña fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619136/atlas/opt6kvnhf0uhalwdjqwb.png", "Piñatex leather alternative"),
  ],
  /* ── Animal / Protein Fibers ── */
  alpaca: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619205/atlas/olset8dyvyadkk9vqtzb.jpg", "Alpaca fleece"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619204/atlas/akmglkkhyxvb9ckffe2r.jpg", "Alpaca fiber detail"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619207/atlas/e5nfrcm9kb3qqnffddqa.jpg", "Alpaca yarn"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619208/atlas/spgrxiqfiz6gcxdvqmk8.jpg", "Huacaya alpaca"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619211/atlas/eohp2eik3xfzpe5h7vzz.jpg", "Suri alpaca locks"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619213/atlas/edblonehrotg5u6ckebk.jpg", "Suri alpaca fiber"),
  ],
  cashmere: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619218/atlas/wwsaqii8lm9hdfzjgddw.jpg", "Cashmere fiber"),
  ],
  nettle: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771714087/atlas/vm96tfgwy69otsdf9ilp.jpg", "Nettle plant", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_13,y_12,w_604,h_810/v1771828909/atlas/ndamslbpawqsynq8fzah.jpg", "Nettle fiber extraction", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828910/atlas/yhwt0izk9bfiypxoojib.jpg", "Nettle fibers unprocessed"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828910/atlas/lltjrxybhanbsu5e4142.jpg", "Himalayan nettle shawl"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828911/atlas/w4udqri9siwbq1saj1xj.jpg", "Hand spun nettle yarn"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828912/atlas/qdy2z5lliiaw3zwwtemw.jpg", "Combed nettle fibers"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828913/atlas/xgvvsviy1w7f2tqz1q4g.jpg", "Fine nettle fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828914/atlas/vr3xay6zlrh6fgcq2oaz.webp", "Bast fibres nettle"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828914/atlas/qxhixvgykto5oiit7lys.jpg", "Nettle natural background"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828915/atlas/putehpjhtofvsopcamqm.jpg", "Stinging nettle plant isolated", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828916/atlas/icruy7klvxqozczz4vfi.jpg", "Rural nettles", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828917/atlas/mpzb1fd0p8coaca1uptd.jpg", "Fresh nettle plants close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828918/atlas/rynjjzlzwnlwctloisvv.jpg", "Stinging nettle weed"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828919/atlas/vknwzfqxxxssdm4ogjcj.jpg", "Polystem stinging nettle", undefined, "portrait"),
  ],
  abaca: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748688/atlas/skeozdno1yhxzsqboxvc.jpg", "Abaca tree", "MarvinBikolano, CC BY-SA 4.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748686/atlas/k1t9swxpwlobsiqgrgmc.jpg", "Abaca fiber drying", "John Washington, CC BY-SA 4.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619154/atlas/ong9rnnwemjduqt92x2y.jpg", "Abaca fiber strands"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748683/atlas/x6y3ocyutjact1dq5y23.jpg", "Abaca sachsenleinen", "CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619148/atlas/ejoqyjpuabqk9l0wdao9.jpg", "Manila hemp rope"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619147/atlas/eu3b1ht6b5zmldipacqg.jpg", "Abaca processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619149/atlas/frtxfaemdegnw8myds5a.jpg", "Abaca weaving"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619152/atlas/h5i9gzd6hr6uzwlyrfjc.jpg", "Abaca textile"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619181/atlas/wb7uhw68q6odzjpllgnw.jpg", "Abaca fiber detail"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748692/atlas/vpbfsp8muaiijobyrhsg.jpg", "Abaca fiber bundles", "MarvinBikolano, CC BY-SA 4.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748680/atlas/csmhwexzba8c9hwe0oby.jpg", "Abaca fiber (Manila Hemp)", "Openverse", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748682/atlas/r9y9bulw1mqptijriyuq.jpg", "Abaca sachsenleinen raw", "CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748681/atlas/z54sfyyhr9of2kgxuylc.jpg", "Filipino rope factory, combing fibers", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748684/atlas/l1uwfrj8vtlgfzfsqupl.jpg", "Assorting Manila hemp fiber", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748684/atlas/xj0aqirurdqirgcm6ifc.jpg", "Abaca sachsenleinen processed", "CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748686/atlas/xmir9g9nrxfxpspbeyp3.jpg", "Stripping abaca tree", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748687/atlas/moqjcxlfpqxxpgf9124k.jpg", "Cleaning Manila hemp fiber", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748689/atlas/zae1ump5ic7y3kds7faa.jpg", "Hanging Manila hemp to dry", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748690/atlas/kzfhgk5a2cmg6izfs7vn.jpg", "Cleaning Manila hemp", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748690/atlas/uqdkqksjglk3nkxyhgbd.jpg", "Cutting down abaca tree", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748691/atlas/mwkrcslj7yrdqyvslod4.jpg", "Assorting Manila hemp grades", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748693/atlas/xgeg4i3oj2sazogeibn8.jpg", "Abaca fiber detail", "Openverse", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748693/atlas/fj9rxodkcsz09eewajsa.jpg", "Manila hemp bundle", "Openverse"),
  ],
  mohair: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619216/atlas/zcp45m47mrdgfn9w7k9w.png", "Mohair fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741088/atlas/vk0uskoicccdscrbgipu.jpg", "Angora goats", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741074/atlas/gads6lqyezgd0vosv39h.jpg", "Angora goat fleece", "Pexels", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_7,y_6,w_1010,h_669/v1771741074/atlas/disiefaywmksf4hp1occ.jpg", "Angora goat portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741077/atlas/cyns84qym5shzehdgjft.jpg", "Angora goat horns", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741078/atlas/a8fzlcvwx5eeutiwzkzb.jpg", "Quebec angora goat", "Erica Peterson, CC BY 2.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741077/atlas/sx88ey2dxemejpdha44s.jpg", "Angora goat", "Public domain"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741072/atlas/t0rfehhvu68pj0ynj8hd.jpg", "Angora goat herd", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741075/atlas/wn4rxgwlhzngztyvsjhw.jpg", "Angora goat fiber detail", "Public domain", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741076/atlas/jk5ifvg5yzylsyow5yqp.jpg", "Angora goat close-up", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741079/atlas/kt33cepkht3fr17xd1ck.jpg", "Angora goat in Norway", "Ernst Vikne, CC BY-SA 2.0", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741080/atlas/nuqqrtixu7k2moqdwyjg.jpg", "Angora goat in pen", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741081/atlas/rpqb4gwapwvpxoulvmbm.jpg", "Angora goat capra hircus", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741082/atlas/ysmirxigpprf2ncot4to.jpg", "Angora goats, not sheep", "Openverse", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741083/atlas/rbojjyysl8ztrvxoknex.jpg", "Angora and brown goats", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741086/atlas/zpkzzedxngkkykpgw4ws.jpg", "Tiftik Keçisi Gravürü", "VEKAM, CC BY-NC-SA 4.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741087/atlas/sgbbsnntxtxw6x7s2vt5.jpg", "Serene angora goat", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741089/atlas/c9qnhcyy0eo09dy3lcw3.jpg", "Modern angora goat", "Public domain"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741092/atlas/iz21uvurpdk8vmo35huw.jpg", "Angora goats near Tuba City, ca.1900", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741095/atlas/k6yqklzbblggeolo6i8f.jpg", "Angora Goat capra hircus", "Drew Avery, CC BY 2.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741081/atlas/asaj547h6ukhwfxgc1h3.jpg", "Angora goat", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741088/atlas/gpj66qtu5c1c0knihpdw.jpg", "Angora goats near Berriedale", "sylvia duckworth, CC BY-SA 2.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741090/atlas/jdif7vqaeecmysf5fzep.jpg", "Angora goat in pasture", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741091/atlas/ijbwbmcfneyllujeymfs.jpg", "Angora goat close-up", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741092/atlas/wv0nvsdyelrpnrbcvgix.jpg", "Angora goat historical photo", "State Government Photographer, CC0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741093/atlas/uvijnbspdzxem4dj26st.jpg", "Wild Angora goat", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741094/atlas/ddh3qaxxx2glluywcgmp.jpg", "Angora goat portrait", "Unsplash"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741096/atlas/r9lndx7trkc2flykvkth.jpg", "Angora goat", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741097/atlas/vsqvyzozjutb6yc5thrc.jpg", "Angora goat", "Openverse"),
  ],
  lyocell: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619283/atlas/poiednmozdgvjyebqe6h.jpg", "Lyocell fabric"),
  ],
  modal: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619281/atlas/arlz1b51vhdn3orb1ry3.jpg", "Modal fiber"),
  ],
  kenaf: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771656856/atlas/qnssqaxykqog9esauhqs.jpg", "Kenaf plant"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771656856/atlas/s1u4qj152zdt8zfg6pz5.jpg", "Kenaf fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_0,y_4,w_220,h_306/v1771656859/atlas/o5cbe7lspdiwnezlce4e.png", "Kenaf stalk cross-section", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771656914/atlas/t6eqe3odbw9rpwtwvyzp.jpg", "Kenaf field"),
  ],
  yak: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619253/atlas/epurwzsvlfws4fi3tez3.jpg", "Yak in highland pasture"),
  ],
  llama: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619222/atlas/w5twa1owfr4vkbvgzt18.jpg", "Llama portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619224/atlas/nm4v5g66tbrdp4zf0k0u.jpg", "Llama fleece"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619225/atlas/fbpd3d6i51zrt9zkv7uq.png", "Llama fiber processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619236/atlas/rnkhf5toocpqmxh8dy8v.jpg", "Llama in Andes"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619229/atlas/zqbjsnj9h7avivchhl7k.jpg", "Llama herd"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619239/atlas/shy6srrbdyexnkcajkb6.jpg", "Llama close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619242/atlas/gsck6jybgul3ygjlpvr1.jpg", "Llama wool"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619245/atlas/qfcgpckfqudsxyizrvhm.jpg", "Llama textile"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619247/atlas/hcnbosnu1qymrcaxqvug.jpg", "Andean llama"),
  ],
  bison: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619255/atlas/mplwe2qsjn0qjt2v1lqw.avif", "American bison"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619257/atlas/yqxympjgmhtejsmh9t07.avif", "Bison close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815787/atlas/o14pdcea9t4mwbyecmd0.jpg", "Bison portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815780/atlas/e4jadrqo9z2ogkkhbse2.jpg", "The Mighty Bison"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815778/atlas/f2mxp0nhx0bzivd6jjgs.jpg", "Bison in snow"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815781/atlas/wtykvhinyujm68uddxz9.jpg", "Bison herd"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815782/atlas/bzwxqaau939lo6eg1adw.jpg", "Bison winter coat"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815783/atlas/g4cbfixwzj9ud3ngmpon.jpg", "Bison wildlife"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815784/atlas/pzmr1se3cqro3h8y6fzx.jpg", "Bison power"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815786/atlas/t60swdqkdchi8bvus1ls.jpg", "Bison power stance"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815788/atlas/lianyc1dggqipsgtjfy8.jpg", "American bison portrait", undefined, "portrait"),
  ],
  henequen: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619156/atlas/i9h3sb5psqmyvitcfh50.jpg", "Henequen fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619158/atlas/zg1mqfgqqlyxm5syt2fj.jpg", "Henequen plant"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619161/atlas/hmrxdmlpp2nldevlks3n.jpg", "Henequen cultivation"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619164/atlas/aychyppaxppjdd8czqmi.jpg", "Henequen processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619168/atlas/gt6m7x6y2pt8yr9d1hh5.jpg", "Henequen harvest"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619163/atlas/q7p14cyr9gnb9udc9eqv.jpg", "Henequen agave"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619166/atlas/us5s9zsnmm9a9pme4mgv.jpg", "Henequen rope"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_0,y_83,w_640,h_477/v1771619170/atlas/mhglvnzoxzs1ufuueol1.jpg", "Henequen textile"),
  ],
  "navajo-churro": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727633/atlas/lfl3mxnpejbog7qbsrye.jpg", "Navajo-Churro sheep"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727630/atlas/qu3j8entjp3rfauoq6fd.jpg", "Navajo people and sheep", "Ken Hammond, Public domain"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727633/atlas/qq1yhh2nbczbsqh5qq40.jpg", "Navajo-Churro breeds"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619201/atlas/obffp3woc2jalytogvwp.webp", "Navajo-Churro wool"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727635/atlas/ercnuajhgqm2bil54ykw.jpg", "Navajo-Churro lambs"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727631/atlas/c1r3xytmi6ekbowjbsrc.jpg", "Navajo-Churro ewe", "Just chaos, CC BY 2.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727631/atlas/eyzwlfjx1hiy37bdsxac.jpg", "Navajo-Churro sheep herd", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727630/atlas/te2y3d2wnqeoceooqq4w.jpg", "The Comfort of Wool", "Openverse"),
  ],
  camel: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619249/atlas/kddshu1gldly58a587tf.avif", "Camel portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619250/atlas/dwr2tlw2vfcmbqhxhuo6.avif", "Camel hair fiber"),
  ],
  qiviut: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619259/atlas/ual6cgngzcjfl6wtdbk7.jpg", "Musk ox qiviut"),
  ],
  "spider-silk": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619279/atlas/er6dkflqfsskvsyvdyw2.jpg", "Spider silk web"),
  ],
  horsehair: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619278/atlas/lnnkjf82gd2q6ipf42v3.jpg", "Horsehair fiber"),
  ],
  milkweed: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619143/atlas/ombbjli9aanccysehkmu.jpg", "Milkweed fiber"),
  ],
  esparto: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619176/atlas/jksxm0rrccoesefxivqn.jpg", "Esparto grass"),
  ],
  loofah: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619291/atlas/uvw5qsdki7ykzcwbeteb.jpg", "Loofah sponge fiber"),
  ],
  rambouillet: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727450/atlas/avyjf3tsczjo6b6zpyv6.jpg", "Rambouillet ram"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727451/atlas/awvrkkwlipy98hxn7aca.jpg", "Rambouillet merino"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619192/atlas/css5nftmmei00gijyiwp.jpg", "Rambouillet wool"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727448/atlas/pnhhyoxxsrdaej7ogbwo.jpg", "Rambouillet wool top"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727449/atlas/rutw0vnrfevyh6geo7py.jpg", "Rambouillet roving"),
  ],
  /* ── Regenerated Fibers ── */
  "viscose-rayon": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619285/atlas/g6embgv1jvxmpem5lhcz.jpg", "Viscose rayon fiber"),
  ],
  cupro: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619287/atlas/ombpcds9vikoh5i1hjhd.jpg", "Cupro fiber"),
  ],
  /* ── Dyes ── */
  indigo: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619487/atlas/pphxe9gdh5all8zke1rl.jpg", "Indigo dye vat"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619484/atlas/qmslxeyupavx9zab94pb.jpg", "Indigo plant leaves"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619501/atlas/ywsuqfika8pavfpbo6jy.jpg", "Indigo dyed fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619482/atlas/elp9xtu1sgc1ae37wxle.jpg", "Indigo pigment blocks"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619492/atlas/z7aii3oingdm6afdmz21.jpg", "Indigo dyeing process"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619489/atlas/qzdz56bvbxlu2zbsnnhv.jpg", "Indigo fabric hanging"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619499/atlas/hft6jcmbcouvpo5lobkb.jpg", "Indigo textile pattern"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619494/atlas/crah6qutqfjoqr0ehgw7.jpg", "Indigo shibori"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619497/atlas/ey61zrvm8veshdq3wmfa.jpg", "Indigo artisan"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619491/atlas/zw5gqhrgf2pcpplfzfsd.jpg", "Indigo dye shades"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619503/atlas/bubuhqiqojf0yeorda3z.jpg", "Indigo workshop"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771539118/k8k5g9ds1ld6oc3cr2ak.jpg", "Natural indigo"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619504/atlas/agwkgkwgb49heinxwiin.jpg", "Indigo dyed yarn"),
  ],
  /* ── Additional Plant Fibers ── */
  sweetgrass: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619635/atlas/cpiq70rhbutlzou9xbbk.jpg", "Sweetgrass braid"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619631/atlas/etdog21xcilwjv1ipkej.jpg", "Sweetgrass harvest"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619637/atlas/fnyi5flvohpjhpt28usm.jpg", "Sweetgrass weaving"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619634/atlas/o04pyd78pdrlxnqlgvvf.jpg", "Sweetgrass basket"),
  ],
  raffia: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775506165/atlas/skpmybeuzezhj9yh9eor.jpg", "Raffia — Natural Fiber Atlas"),
    img("https://helenkaminski.com/cdn/shop/files/process-647x1098_0007_20252506_MADAGASCAR_C3_2739.jpg?v=1765863926", "Raffia craft, Madagascar"),
    img("https://helenkaminski.com/cdn/shop/files/process-647x1098_0006_20252506_MADAGASCAR_C3_2741.jpg?v=1765863926", "Raffia processing"),
    img("https://helenkaminski.com/cdn/shop/files/process-647x1098_0004_20252506_MADAGASCAR_DAY3_2317.jpg?v=1765863927", "Raffia harvest"),
    img("https://helenkaminski.com/cdn/shop/files/1680x1200_0001_20252506_MADAGASCAR_DAY7_5152.jpg?v=1765863927", "Raffia landscape"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619697/atlas/pkqfjcnypmzmnvvzf1fu.jpg", "Raffia fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619703/atlas/ybqb9tetqo5iinmog0gd.jpg", "Raffia weaving"),
    img("https://helenkaminski.com/cdn/shop/files/process-647x1098_0001_20252506_MADAGASCAR_DAY5_4165.jpg?v=1765863927", "Raffia workshop"),
    img("https://helenkaminski.com/cdn/shop/articles/blog_tile_c868e9d0-06c8-42bd-8b54-4dc91737cc75_1080x.png", "Raffia heritage"),
    img("https://helenkaminski.com/cdn/shop/files/double_image_0000_20252506_MADAGASCAR_C2_1558.jpg?v=1765863927", "Raffia in Madagascar"),
    img("https://helenkaminski.com/cdn/shop/files/1680x1200_0000_20252506_MADAGASCAR_DAY7_5228.jpg?v=1765863927", "Madagascar raffia"),
    img("https://helenkaminski.com/cdn/shop/files/artisans.png?v=1765863928", "Raffia artisans"),
  ],
  fique: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619742/atlas/d0bh8y4vwf0z96lhl2hk.jpg", "Fique fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619743/atlas/nw0lo5hrk5xtbiff84c1.png", "Fique plant"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619741/atlas/jpnlu6o6y6qmzbzk5osb.jpg", "Fique processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619746/atlas/hottvmb8kysiim0dxrge.jpg", "Fique rope"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619747/atlas/pzywv4tra242v6wmy9b6.jpg", "Fique textile"),
  ],
  /* ── Batch 3 Gallery Entries ── */
  "avocado-dye": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748139/atlas/pylksiisbzbatsercdsf.jpg", "Avocado dye"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748136/atlas/byrtnhtm2hjvhcrhk3or.jpg", "Avocado pit dye process"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748137/atlas/otlv91nbmqibdqawfu9j.jpg", "Avocado natural dyeing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748142/atlas/ymkuku7od9bgl0frjtii.jpg", "Avocado pit dye bath"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748143/atlas/qackf1qalygbei5yynh3.jpg", "Avocado dye water"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748144/atlas/bszxodudsg77kxzybfcr.jpg", "Avocado dye aging"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748138/atlas/gph2xazgiamkeqlbx4r5.jpg", "Avocado pit dye simmering"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748146/atlas/oqqkbgdnlc7awtryw5o6.jpg", "Avocado dye pink yarn"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748141/atlas/vwvewhuobjk52oricawm.webp", "Avocado dye two tones"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748147/atlas/tbxcmzq3or9j6dmbxouf.png", "Avocado dye tips"),
  ],
  annatto: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743372/atlas/uhw0y6ab5ypyow5plboy.jpg", "Natural annatto dye"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743365/atlas/skem5foqammnjere2fka.jpg", "Annatto dye tree"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743370/atlas/xnmtnojdkhflpqvibrw0.jpg", "Annatto seeds close-up", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743367/atlas/izgrnmm30dgbvffp31w9.jpg", "Annatto pod on branch"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743371/atlas/wtkguhb9almv2xzdyuqh.jpg", "Annatto seeds in hand"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743368/atlas/atlxazja3ybp3dvyt3z5.jpg", "Bixa orellana in Bali", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743367/atlas/r3laoccnisiszgdsyq8o.jpg", "Annatto tree flowers"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743369/atlas/mwbrselxxvi6ektmjpg6.jpg", "Bixa orellana plant"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743372/atlas/s8ppioiluav6ott0dlxa.jpg", "Fiber dyeing workshop"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743373/atlas/n6atjtn0xwewzhdhaemy.jpg", "Traditional fiber dyeing"),
  ],
  chlorophyll: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828608/atlas/bdzw3komfk1t1isdnpbh.webp", "Green wool yarn skeins"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828604/atlas/uv7wekjoclf5exxruyri.jpg", "Chlorophyllin dye"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828600/atlas/lvf4hv5glbfcu5ld6rgg.jpg", "Natural dye store greens", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828606/atlas/zcg89qvfaudqaolhvp7v.jpg", "Chlorophyllin powder", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828605/atlas/xkrrpm4buof5ubrwksk4.jpg", "Chlorophyllin dye sample"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828602/atlas/s0mapz7tq4gjba2d9jpd.jpg", "Bold greens from dye plants"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828605/atlas/h9fmyo4d1pc9z2kwgluy.jpg", "Chlorophyll extract", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828609/atlas/evgqgcoiejhwzxqvtrrj.jpg", "Green natural dye"),
  ],
  blackberry: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619529/atlas/o7dlr8jlejkgdxxcviwe.jpg", "Blackberry dye"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771824963/atlas/w2nndoenkf8plirzitqo.jpg", "Natural dyeing blackberry"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771824964/atlas/nautbnge3hu6s6txv3i0.jpg", "Blackberry dyed linen", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771824965/atlas/qz6b5le1e0e6dnhmtveh.jpg", "Blackberry hand dyed yarn", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771824965/atlas/ajwv9mtdvhmyzqlrgupc.jpg", "Blackberry leaf dye"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771824966/atlas/sbvhdbhythcz50fusbwm.jpg", "Blackberry dyed sock yarn", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771824967/atlas/euvvedlm9dmctsfm8glr.jpg", "Berry dye fastness test"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771825048/atlas/d1ledvtrmrnhjkht4bo6.jpg", "Blackberry dyed threads"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771825049/atlas/e6uyh2bktod0cwclz8zl.jpg", "Blackberry wool dye"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771825050/atlas/mrw7xc4s7szguoth73uv.webp", "Blackberry dye pot"),
  ],
  elderberry: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743812/atlas/zsdtlskyz16joossntub.jpg", "Sambucus nigra"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743813/atlas/dgnctkk95pitktigsh4c.jpg", "Elderberries with flowers", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743814/atlas/uizx38ifzrz7yg08dpqh.jpg", "Ripe elderberries"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743815/atlas/igsaswmmz9sdkhimkph2.jpg", "Elderberry plant"),
  ],
  batik: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771750057/atlas/jt6mobl9px2y6dha0lae.jpg", "Batik wax printing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771750063/atlas/spd9kifiyyb5nsobg5qq.jpg", "Artisan batik handprinting"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771750059/atlas/chy8cz7iovatfhqjamj6.png", "Traditional batik hand printing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771750063/atlas/gnfiidptghq47xfcvua0.jpg", "Batik printing technique"),
  ],
  shibori: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619573/atlas/aybqbigu3meg9u927sr6.jpg", "Shibori indigo resist"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619572/atlas/j7dt0xxyjeq29cgj7bb0.jpg", "Shibori fabric patterns"),
  ],
  "tie-dye": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619575/atlas/rhdui5rkwvsnxbknnntj.jpg", "Tie-dye fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619576/atlas/eddqqrgwpiri9kt7vazl.jpg", "Tie-dye patterns"),
  ],
  lac: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771657052/atlas/agl084ol9eibcie443p8.jpg", "Lac dye resin"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771657051/atlas/fuynhm3yttsyjplfsups.jpg", "Lac dye raw"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771657051/atlas/woxwijhqyf2s4zfjgqcm.jpg", "Lac dye processed"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771657053/atlas/iqjm8dhxz0lrim5t0hei.jpg", "Lac dye pigment"),
  ],
  ayate: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771742430/atlas/cj0uvxenofxwhz8bicli.jpg", "Ayate back-scrubber cloth"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771742431/atlas/accb5pyahaml6zathyex.webp", "Ayate bathing cloth"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771742432/atlas/guwughaaiftye9wkerjt.jpg", "Ayate loofah"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619685/atlas/mhehbhrvqb9e10ma5dxe.jpg", "Ayate agave cloth"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771742434/atlas/fkkukgaxkk4mclrpnjfn.jpg", "Ayate agave fiber washcloth", undefined, "portrait"),
  ],
  krajood: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619689/atlas/lxq5ebpnuuvn3lu49x17.jpg", "Krajood sedge weaving"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619695/atlas/i1xto24x8md3yaazsyxd.jpg", "Krajood basket"),
  ],
  carpet: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748833/atlas/fop9ksro9me4e8yhhte2.jpg", "Persian carpet masterpiece"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619738/atlas/fztbfiyix1yq7l6fihpg.jpg", "Carpet weaving"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619740/atlas/a0dis4pmxfjbsvyacd71.jpg", "Hand-knotted carpet"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748834/atlas/mmn6l2m6rbdsdzmosqdd.jpg", "Persian rug outdoor"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748836/atlas/ccidzzk6t71lphjb8bha.jpg", "Antique Persian carpet"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748837/atlas/elf2gctf6ty231kt2cru.jpg", "Swedish carpet exhibition"),
  ],
  spinning: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771657863/atlas/gegjkntl1jdwbktwtxji.jpg", "Hand and wheel spinning wool"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619404/atlas/jorm3fa7yyicidprpibv.jpg", "Ring spinning"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619408/atlas/ivucffvpe8xlq1ixyfe1.jpg", "Rotor (open-end) spinning"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619409/atlas/xonsmbswcg7hywjzup4m.jpg", "Air-jet spinning"),
  ],
  knitting: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628165/atlas/z1yghqwymlr5gjvk7a0j.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628158/atlas/ylpytdyuyh4sjfmgvwh3.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628707/atlas/cleb8cwwctcypwdrnslf.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775627889/atlas/g6ytepocmrgotcyfzmmg.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628115/atlas/iogbrkwye5olyhcekls7.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628243/atlas/aihyqsvv9l9is1gz0yuy.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628100/atlas/u8rqs6xmr2pia397osst.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628108/atlas/f0pfg49truwcu6xc6k5g.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628134/atlas/owgfgwdjfbuyuitr47sn.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628181/atlas/n5zmd8jrsid47ofdqpee.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628239/atlas/sdfw6dpjbp2nqzbdpl5v.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628607/atlas/lmsyblcljfoy0teqc26w.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628680/atlas/vp1torkhdysbtwvll29a.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628741/atlas/s0ugxnzkm9qd3p1tmfcj.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628755/atlas/fchfpm7iojih7vvsqqcs.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628788/atlas/cz9w1i3k437lfwgqqncf.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619379/atlas/jtv4qymbqpncu4dfnjfw.jpg", "Knitting — hero"),
    img("https://helenkaminski.com/cdn/shop/files/stitches-1080x1350_0001_helen_kaminski_SS25_Kirana_crochet_stitch_612x.jpg?v=1765934435", "Kirana stitch detail"),
    img("https://helenkaminski.com/cdn/shop/files/stitches-1080x1350_0002_helen_kaminski_SS25_Mala_crochet_stitch_612x.jpg?v=1765934435", "Mala stitch detail"),
    img("https://media.jamesdunloptextiles.com/image-transform/8cu89TjtOYIFJGZftnClsWL5NRc=/fit=cover,width=563,height=423,format=auto/https://media.jamesdunloptextiles.com/media/news/2022_05/26ea8bc023cf110f9f112c336a2e8315--knit-crochet-spinning_MqRLCCU.jpg", "Knit, crochet, and spinning studio"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619350/atlas/xbyvbhkqvsoodplxb8de.jpg", "Cable knit texture"),
  ],
  "block-print": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619651/atlas/dxneiijpebu9cqqvnxfj.jpg", "Block printing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619654/atlas/pd51lqlvtleqqliogsgz.jpg", "Block print fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619655/atlas/sl6nw9dbuwue5wirt7z6.jpg", "Block print stamps"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619657/atlas/okiboucwyfswctais7zo.jpg", "Hand block printing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619659/atlas/fa7cd6syjxeoz0mxcn72.jpg", "Block print pattern"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619660/atlas/a9lsqi1gvsdzbuxfspfi.jpg", "Indian block print"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619661/atlas/t6onachc1irepisoqijs.jpg", "Block print workshop"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619664/atlas/dnblcqtkwl5mpkxtn1wr.jpg", "Block print detail"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619665/atlas/xifyx1twb4j6nwjk0jlj.jpg", "Block print artisan"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619666/atlas/hcdqk6vxtontna2qwfj2.jpg", "Fabric block printing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619668/atlas/g9unynsnnf6mfhwc5v5r.jpg", "Block print textiles"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619671/atlas/kbmnwfqa1k2lyjzjiqzh.jpg", "Block print tradition"),
  ],
  "leno-weave": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619672/atlas/ywiwxtgbeos81eqcsj7i.webp", "Leno weave structure"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619678/atlas/yep56issntitkamckuip.jpg", "Leno weave fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619679/atlas/exfixrapre9dvunfw1dc.webp", "Leno gauze"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619680/atlas/smd8ihre47qiqdzxscqb.jpg", "Leno weave detail"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619683/atlas/tne7hfzuvlhzskcckynp.png", "Leno weave diagram"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619684/atlas/knrxuq33lzwcjl1wwjxb.jpg", "Leno weave textile"),
  ],
  henna: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619642/atlas/y3wqh73yyza0ijy66u5g.jpg", "Henna art"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619643/atlas/cuqdudnsszivdr0pzdus.jpg", "Henna leaf dye"),
  ],
  lotus: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619641/atlas/norl5xkkugaq4ayshyxo.jpg", "Lotus fiber extraction"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619639/atlas/ldug89ynybqnhjbjsquf.jpg", "Lotus stem fiber"),
  ],
  alum: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771717718/atlas/oxyxgyuqwur3kfmfzy3c.webp", "Alum crystals"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771717719/atlas/pgeas8x5qcpnipy6mddl.jpg", "Shaving alum in bowl"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771717721/atlas/f2dbsta3qrplhchdinnn.jpg", "Potassium alum stones"),
  ],
  alder: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619478/atlas/i8g9l6klvx34ab7t7ioz.jpg", "Alder bark"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771716899/atlas/kna8sjesjydo6eqz6qfk.jpg", "Yellow alder flowers"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771717621/atlas/sxc3zklc9ixps0xcjt6r.webp", "Red alder bark chips"),
  ],
  "black-walnut": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815921/atlas/ia2gr8hto0ryner6uzxt.jpg", "Walnut hull dyeing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815923/atlas/l78guooazegu4r7ec3ks.jpg", "Black walnut dye solution", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815922/atlas/sq0niv6sxpvfscj5wmev.jpg", "Walnut tannin extraction"),
  ],
};

/* ═══════════════════════════════════════════════════════════════════
   GALLERY IMAGE HYDRATION
   Boot path only hydrates hero + curated images synchronously.
   Bulk JSON enrichment is deferred until a fiber gallery is requested.
   ═══════════════════════════════════════════════════════════════════ */

/** Alias map for JSON profileKeys that don't exactly match fiber IDs */
const jsonKeyAliases: Record<string, string> = {
  "coir-coconut": "coir",
  "lyocell-tencel": "lyocell",
  "pineapple-pina": "pineapple",
  "cotton": "organic-cotton",
  /** Profile renamed from crochet; merge disk exports under `knitting`. */
  crochet: "knitting",
  /** Legacy nav / disk export id; canonical catalog row is `tussar`. */
  tussah: "tussar",
};

interface NewImagesProfile {
  profileKey: string;
  imageLinks: string[];
}

interface NewImagesPayload {
  profiles: NewImagesProfile[];
}

const mergedGalleryMap: Record<string, GalleryImageEntry[]> = {};
const hydratedJsonFibers = new Set<string>();
let jsonImageMapCache: Map<string, string[]> | null = null;
let jsonImageMapPromise: Promise<Map<string, string[]>> | null = null;

function createBaseGalleryForFiber(fiberId: string, heroImage: string): GalleryImageEntry[] {
  const curated = galleryMap[fiberId];
  const seen = new Set<string>();
  const merged: GalleryImageEntry[] = [];
  seen.add(heroImage);
  merged.push({ url: heroImage });
  if (curated) {
    for (const entry of curated) {
      if (!seen.has(entry.url)) {
        seen.add(entry.url);
        merged.push(entry);
      }
    }
  }
  return merged;
}

function ensureBaseGalleryMap(): void {
  if (Object.keys(mergedGalleryMap).length > 0) return;
  for (const f of fibers) {
    const merged = createBaseGalleryForFiber(f.id, f.image);
    f.galleryImages = merged;
    mergedGalleryMap[f.id] = merged;
  }
}

async function loadJsonImageMap(): Promise<Map<string, string[]>> {
  if (jsonImageMapCache) return jsonImageMapCache;
  if (!jsonImageMapPromise) {
    jsonImageMapPromise = import("../../../new-images.json")
      .then((mod) => {
        const payload = (mod.default ?? mod) as NewImagesPayload;
        const map = new Map<string, string[]>();
        for (const profile of payload.profiles ?? []) {
          const resolvedId = jsonKeyAliases[profile.profileKey] ?? profile.profileKey;
          if (profile.imageLinks?.length) {
            map.set(resolvedId, profile.imageLinks);
          }
        }
        jsonImageMapCache = map;
        return map;
      })
      .catch(() => {
        const empty = new Map<string, string[]>();
        jsonImageMapCache = empty;
        return empty;
      });
  }
  return jsonImageMapPromise;
}

function mergeJsonUrlsIntoFiberGallery(fiberId: string, jsonUrls: string[]): void {
  if (hydratedJsonFibers.has(fiberId) || jsonUrls.length === 0) return;
  const existing = mergedGalleryMap[fiberId] ?? [];
  const seen = new Set(existing.map((entry) => entry.url));
  const merged = [...existing];
  for (const url of jsonUrls) {
    if (!seen.has(url)) {
      seen.add(url);
      merged.push({ url });
    }
  }
  mergedGalleryMap[fiberId] = merged;
  const fiber = fibers.find((candidate) => candidate.id === fiberId);
  if (fiber) fiber.galleryImages = merged;
  hydratedJsonFibers.add(fiberId);
}

for (const f of fibers) {
  const merged = createBaseGalleryForFiber(f.id, f.image);
  f.galleryImages = merged;
  mergedGalleryMap[f.id] = merged;
}

/** Look up gallery images for a fiber by ID. Returns empty array if none found. */
export function getGalleryImages(fiberId: string): GalleryImageEntry[] {
  ensureBaseGalleryMap();
  void prefetchGalleryImagesForFiber(fiberId);
  return mergedGalleryMap[fiberId] ?? [];
}

/**
 * Gallery shown in the product UI: fiber overrides (promoted / localStorage) first,
 * then the baseline from curated atlas-data + new-images.json. Dedupes by URL so a
 * partial galleryImages patch cannot hide the rest of the catalog (e.g. after a single
 * upload is synced to promoted-overrides).
 *
 * When `galleryImages` is an empty array, that means the curator explicitly cleared the
 * gallery (admin save). Do not substitute the baseline catalog — otherwise “deleted”
 * images reappear on the public grid and in crossfade layers.
 */
export function mergeFiberGalleryWithFallback(
  fiberId: string,
  fiber: Pick<FiberProfile, "galleryImages">,
): GalleryImageEntry[] {
  const primary = fiber.galleryImages ?? [];
  if (primary.length === 0) return [];

  const fallback = getGalleryImages(fiberId);
  const seen = new Set<string>();
  const out: GalleryImageEntry[] = [];
  for (const e of primary) {
    const u = e.url?.trim();
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(e);
    }
  }
  for (const e of fallback) {
    const u = e.url?.trim();
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(e);
    }
  }
  return out;
}

/** Fiber row with `galleryImages` matching the public grid (override URLs + catalog baseline). */
export function withMergedGalleryImages(fiber: FiberProfile): FiberProfile {
  return {
    ...fiber,
    galleryImages: mergeFiberGalleryWithFallback(fiber.id, fiber),
  };
}

export async function prefetchGalleryImagesForFiber(fiberId: string): Promise<void> {
  ensureBaseGalleryMap();
  if (!fiberId || hydratedJsonFibers.has(fiberId)) return;
  const map = await loadJsonImageMap();
  const jsonUrls = map.get(fiberId) ?? [];
  mergeJsonUrlsIntoFiberGallery(fiberId, jsonUrls);
}

export async function prefetchGalleryImagesForFibers(fiberIds: string[]): Promise<void> {
  ensureBaseGalleryMap();
  const targets = [...new Set(fiberIds.filter(Boolean))].filter((fiberId) => !hydratedJsonFibers.has(fiberId));
  if (targets.length === 0) return;
  const map = await loadJsonImageMap();
  for (const fiberId of targets) {
    mergeJsonUrlsIntoFiberGallery(fiberId, map.get(fiberId) ?? []);
  }
}