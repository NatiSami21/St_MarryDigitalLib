import Constants from "expo-constants";
import { generateSalt, hashPin } from "./authUtils";

/**
 * Use env: EXPO_PUBLIC_ONLINE_MODE=true to enable real requests.
 * Default: mocked responses (local).
 */
const ONLINE = (process.env.EXPO_PUBLIC_ONLINE_MODE === "true") || false;

type ActivatePayload = { username: string; pin: string; device_id: string };

// CSV data from your bookInventory.csv
const BOOK_INVENTORY_CSV = `book_code,title,author,category,notes,copies
1,መጽሐፍ ቅዱስ ሰማያዊ አሎዲ,,Bible,Blue Bible,3
1.1,መጽሐፍ ቅዱስ 77,,Bible,Bible 77 Books,2
1.2,መጽሐፍ ቅዱስ 66,,Bible,Bible 66 Books,2
1.3,መጽሐፍ ቅዱስ 66 ኦሮምኛ,,Bible,Bible 66 Books (Oromiffa),3
1.4,ወንጌል ሉቃስ እንደጻፈው,,Bible,Gospel according to Luke,2
1.5,የጳውሎስ መልእክት ወደ ቲቶ,,Bible,Paul's Epistle to Titus,11
1.6,መጽሐፍ ቅዱስ መማሪያ,,Bible,Bible Study,1
2,ገድላት,,Hagiography,Lives of Saints (General),1
2.1,ገድለ አርሰማ,,Hagiography,Life of St. Arsema,1
2.2,ተአምረ ማርያም በግዕዝና በአማርኛ,,Hagiography,Miracles of Mary (Ge'ez & Amharic),1
2.3,ገድለ ሐዋርያት በግዕዝና በአማርኛ,,Hagiography,Acts of the Apostles (Ge'ez & Amharic),1
2.4,ድርሳነ ቅ/ኦኑኤል,,Hagiography,Homily of St. Onuphrius?,1
2.5,ድርሳነ ሩፋኤል,,Hagiography,Homily of St. Raphael,2
2.6,ድርሳነ ገብርኤል,,Hagiography,Homily of St. Gabriel,1
2.7,ድርሳነ ኢየሱስ ወክርስቶስ,,Hagiography,Homily of Jesus Christ,1
2.8,ድርሳነ ሚካኤል,,Hagiography,Homily of St. Michael,2
2.9,ዜና ሥላሴ,,Hagiography,News of the Trinity,1
2.1,ገድለ አቡነ መልከ ጻድቅ,,Hagiography,Life of Abune Melke Tsedek,2
2.11,ገድለ አዳም,,Hagiography,Life of Adam,3
2.12,ገድለ አቡነ ገ/መንፈስ ቅዱስ,,Hagiography,Life of Abune Gebre Menfes Kidus,1
2.12,ገድለ ጊዮርጊስ,,Hagiography,Life of St. George (Duplicate code in source),1
2.13,ገድለ ቅ/?? ማርያም ግብጻዊት,,Hagiography,Life of St. Mary of Egypt,1
2.14,ገድለ ዘዮሐንስ,,Hagiography,Life of ZeYohannes,1
2.15,ገድለ ገ/ማርያም ወ ማህለተ ጽጌ,,Hagiography,Life of G/Mariam & Mahilete Tsige,2
2.16,ቅዱስ እንስሳት ተጋድሎ,,Hagiography,Struggle of Holy Animals?,1
2.17,ቅዱስ ቂርቆስ ህጻን,,Hagiography,St. Kirkos (Child),2
2.18,ገድለ ቅዱስ ቂርቆስ,,Hagiography,Life of St. Kirkos,2
2.19,ገድለ ፈለገ ወንጌል,,Hagiography,Life of Felege Wongel,1
2.2,መልእክተ ከመጽሐፍ ቅዱስ አስተምሮ,,Hagiography,Epistle/Teaching from Bible,1
2.21,ቅዱስ ዮሐንስ አፈወርቅ ህይወቱና ትምህርቱ,,Hagiography,St. John Chrysostom Life & Teaching,1
2.22,ገድለ ጻድቅ ለዓለም ይሄ ሁሉ,,Hagiography,Life of the Righteous...,1
2.23,መዝሙረ ተዋህዶ ዘኦርቶዶክስ,,Hagiography,Orthodox Tewahedo Hymns,1
2.24,አርጋኖን ዘሰንበት,,Hagiography,Arganon ZeSenbet (Praises of Mary for Sunday),1
3,የአንድምታ መጻሕፍት,,Commentaries,Commentary Books (General),1
3.1,ወንጌል ቅዱስ ትርጓሜ,,Commentaries,Holy Gospel Commentary,2
3.2,መዝሙር ዳዊት ንባቡ ከትርጓሜው,,Commentaries,Psalms of David (Reading & Commentary),2
3.3,መጽሐፈ ሰሎሞን ወሲራክ መዝገበ ቃላት ሐዲስ,,Commentaries,Books of Solomon & Sirach (New Dictionary),1
3.4,ኪዳን ወልድ ክፍለ,,Commentaries,Kidan Wold Kifle (Author/Book),1
3.5,የመጽሐፍ ቅዱስ መዝገበ ቃላት,,Commentaries,Bible Dictionary,1
3.6,ትንቢተ ኤርምያስ አንድምታ,,Commentaries,Prophecy of Jeremiah Commentary,1
3.7,መጽሐፍተ ሰሎሞን,,Commentaries,Books of Solomon,1
3.8,ወንጌል ቅዱስ ትንታኔ,,Commentaries,Holy Gospel Analysis,1
3.9,አንቀጽ ዘጠኝ,,Commentaries,Ankest ZeTegn (Clause 9?),2
3.1,መጽሐፈ ሰዓታት,,Commentaries,Book of Hours,1
3.11,የአንቀጽ ብርሃን አንድምታ,,Commentaries,Ankest Berhan Commentary,1
3.12,ቃላት ወንጌል,,Commentaries,Words of the Gospel,1
3.13,መጽሐፈ ቀሌምንጦስ,,Commentaries,Book of Clement,3
3.14,አንቀጽ ግብረ ህማማት,,Commentaries,Acts of Passion Commentary (Amharic note in source),2
3.15,አውደ ጽድቅ,,Commentaries,Awde Tsidk,3
3.16,የሐዋርያው የቅዱስ ያዕቆብ መልእክት,,Commentaries,Epistle of St. James,1
4,የውስጥ አገልግሎት መጻሕፍት,,Liturgical,Inner Service/Ministry Books,1
4.1,ሃይማኖተ አበው ትልቅ,,Liturgical,Faith of the Fathers (Large),1
4.2,ሃይማኖተ አበው ትንሽ እሜን,,Liturgical,Faith of the Fathers (Small),1
4.3,መጽሐፈ ስንክሳር,,Liturgical,Synaxarium,2
4.5,መጽሐፈ ቅዳሴ,,Liturgical,Book of Liturgy,1
4.6,መጽሐፈ ምሥጢር,,Liturgical,Book of Mystery,1
4.7,መጽሐፈ ግጻዌ ትልቅ,,Liturgical,Book of Lectionary (Large),1
4.8,መጽሐፈ ቅዳሴ ወመዝሙር ከነምልክቱ,,Liturgical,Liturgy & Hymn with Notation,2
4.9,መጽሐፈ ክርስትና,,Liturgical,Book of Baptism,1
4.1,ጸሎተ ቅዳሴ,,Liturgical,Liturgy Prayer,2
5,የክርክር መጻሕፍት,,Theology/Debate,Debate/Apologetics Books,3
5.1,መጽሐፈ ስነ ፍጥረት ትልቅ,,Theology/Debate,Book of Creation (Large),2
5.2,መጽሐፈ አክሲማሮም,,Theology/Debate,Book of Hexaemeron,3
5.3,ነገረ ማርያም በብሉይ ኪዳን,,Theology/Debate,Mariology in Old Testament,1
5.4,ማብራሪያ እምነት,,Theology/Debate,Explanation of Faith,1
5.5,ነገረ ክርስቶስ ክፍል 1,,Theology/Debate,Christology Part 1,1
5.6,ትምህርተ ሃይማኖትና ክርስትያናዊ ህይወት,,Theology/Debate,Doctrine & Christian Life,1
5.7,የነገረ መለኮት መግቢያ,,Theology/Debate,Introduction to Theology,1
5.8,ነገረ ሃይማኖት,,Theology/Debate,Theology/Doctrine,1
5.9,መሠረታዊ የመጽሐፍ ቅዱስ አጠናን ዘዴ,,Theology/Debate,Basic Bible Study Method,1
5.1,ክርስትያናዊ ስነ ምግባር 1,,Theology/Debate,Christian Ethics 1,2
5.11,ምክር,,Theology/Debate,Advice/Counsel,1
5.12,ክርስትያናዊ ስነ ምግባር 2,,Theology/Debate,Christian Ethics 2,2
5.13,የቤ/ክ ታሪክ ቁጥር 1,,Theology/Debate,Church History No 1,3
5.14,ትምህርተ ሃይማኖት መግቢያ,,Theology/Debate,Intro to Doctrine,5
5.15,ስነ ፍጥረት ትንሽ,,Theology/Debate,Creation (Small),2
5.15,ነገረ ማርያም,,Theology/Debate,Mariology (Duplicate code in source),2
5.16,አዕማደ ምሥጢር,,Theology/Debate,Pillars of Mystery,2
5.17,መጽሐፈ ቅዱስ ጥናት ክፍል 2,,Theology/Debate,Bible Study Part 2,2
5.18,ሰባቱ ምሥጢራተ ቤ/ክ,,Theology/Debate,The 7 Sacraments,2
5.19,ሥርዓተ ቤ/ክ,,Theology/Debate,Church Order,3
5.2,ነገረ ቅዱሳን 1,,Theology/Debate,Hagiology 1,1
5.21,ነገረ ቅዱሳን 2,,Theology/Debate,Hagiology 2,1
5.22,አምደ ሃይማኖት,,Theology/Debate,Pillar of Faith,1
5.23,ባሕረ ሐሳብ,,Theology/Debate,Bahire Hasab (Calendar),1
5.24,የመናፍቃን ማንነትና መልሶቻቸው,,Theology/Debate,Identity of Heretics & Their Answers,3
5.25,አባቱ አጽዋማትና ታሪካቸው,,Theology/Debate,Fathers' Fasts & Their History,5
5.26,ነገረ ቤ/ክ,,Theology/Debate,Ecclesiology,2
5.27,ህይወተ ማርያም ድንግል,,Theology/Debate,Life of Virgin Mary,1
5.28,ነገረ ሥጋዌ,,Theology/Debate,Incarnation,1
5.29,ትምህርተ መለኮት,,Theology/Debate,Theology,1
6,የማጣቀሻ መጻሕፍት,,Reference,Reference Books,2
6.1,መጽሐፈ ሲኖዶስ ዘሐዋርያት,,Reference,Synod of Apostles,2
6.2,የኢ/ኦ ተዋህዶ አብያተ ክርስቲያናት,,Reference,Ethiopian Orthodox Tewahedo Churches,1
6.3,የሰ/ት/ቤቶች የውስጥ መተዳደሪያ ደንብ,,Reference,Sunday School Internal Bylaws 1-5,1
6.4,የሰ/ት/ቤቶች የውስጥ መተዳደሪያ ደንብ,,Reference,Sunday School Internal Bylaws 1-12,1
6.5,ርቱዕ ሃይማኖት,,Reference,Orthodox (Right) Faith,2
6.5,ወንጌል ዮሐንስ ምስለ ትምህርተ ሃይማኖት,,Reference,Gospel of John with Doctrine (Duplicate code),2
6.6,ራዕየ ዮሐንስ ዘኦርቶዶክስ,,Reference,Revelation Orthodox,1
6.7,እውለተ አርቶዶክስ,,Reference,Orthodox Daily?,1
6.8,ገድለ ነገሥት,,Reference,Lives of Kings,2
6.9,ራዕየ ዮሐንስ የሃይማኖት ምንጭ,,Reference,Revelation: Source of Faith,2
6.1,በዓላት,,Reference,Feasts/Holidays,3
6.11,በአንተ ቀዳሚ ቃል,,Reference,In You First Word,1
6.12,ክብረ ክህነት,,Reference,Honor of Priesthood,1
6.13,ሁለቱ ኪዳናት,,Reference,The Two Covenants,1
6.14,የሕጻናትና ወጣቶች መማሪያ መጽሐፍ,,Reference,Children & Youth Textbook,1
6.15,ሱማሌ,,Reference,Somale?,1
6.16,በሰለስ አጠናን ዘዴ,,Reference,Trinity Study Method?,2
6.17,እውነተኛ የእግዚአብሔር ሀገር,,Reference,True City of God,3
6.18,የአማርኛ መዝሙራት ድምፅና ግጥም የሚገኙባቸው ጉዳይ,,Reference,Amharic Hymns Audio & Lyrics Guide,1
6.19,ቅድስት ድንግል ማርያም,,Reference,Holy Virgin Mary,1
6.2,ኢየሱስ ማን ነው,,Reference,Who is Jesus?,1
6.21,የፍቅር እናት,,Reference,Mother of Love,1
6.22,መርሆ ምሥጢር,,Reference,Principle of Mystery,1
6.23,እንግዳዊ ትምህርት መለኮት,,Reference,Strange Teaching Theology,1
6.24,እናታችን ጽዮን,,Reference,Our Mother Zion,1
6.25,አማላጅነት ምንድን ነው,,Reference,What is Intercession?,1
6.26,ሥርዓተ ቤ/ክ በዘመነ ሰማዕታት,,Reference,Church Order in Martyrs Era,1
6.27,የቅድስት ድንግል ማርያም ድንቅ ተአምር በኛ ዘመን,,Reference,Miracles of Virgin Mary in Our Time,1
6.28,ትንሳኤ ቤ/ክ,,Reference,Resurrection of Church,1
6.29,የመጽሐፍ ቅዱስ ከተሞችና ሀገሮች,,Reference,Bible Cities & Countries,1
6.3,መጽሐፈ አሚን,,Reference,Book of Amin (Belief),1
6.31,ትምህርተ ጽድቅ,,Reference,Teaching of Righteousness,1
6.32,አተይተ ቁርባን,,Reference,Ateyte Kurban?,1
6.33,መድሎተ ጽድቅ ቅጽ 1,,Reference,Medlote Tsidk Vol 1,1
6.34,መድሎተ ጽድቅ ቅጽ 2,,Reference,Medlote Tsidk Vol 2,1
6.35,የውሸት አውደ ምሥክር,,Reference,Witness of Falsehood?,1
6.36,መድሎተ ጽድቅ ቅጽ 3,,Reference,Medlote Tsidk Vol 3,1
7,የህይወት መጻሕፍት,,Spiritual Life,Spiritual Life Books,1
7.1,የሰይጣን ውጊያዎች,,Spiritual Life,Satan's Attacks/Warfare,1
7.2,ሰማዕትነት እየመጣላችሁ,,Spiritual Life,Martyrdom is Coming to You,3
7.3,የለውጥና የመኖር ምሥጢር,,Spiritual Life,Secret of Change & Living,1
7.4,ታላቁ የምንኩስና ህይወት,,Spiritual Life,The Great Monastic Life,4
7.5,አቢይ የሚጨንቀኝ ምን ቢተ,,Spiritual Life,Abiy... (Unclear title),2
7.6,ሰው ምንድን ነው,,Spiritual Life,What is Man?,2
7.7,ሰባቱ የጸሎት ጊዜያትና ትርጉማቸው,,Spiritual Life,7 Prayer Times & Their Meanings,2
7.8,ተግበሩ ክርስትና,,Spiritual Life,Practice Christianity,4
7.9,የዲያብሎስ ውጊያዎች,,Spiritual Life,Devil's Attacks,1
7.1,ኪዳነ ጽድቅ,,Spiritual Life,Covenant of Righteousness,2
7.11,መንፈሳዊ ውጊያዎች,,Spiritual Life,Spiritual Warfares,1
7.12,በሃይማኖት ፅኑ,,Spiritual Life,Stand Firm in Faith,2
7.13,በሞት የተገለጠ ፍቅር,,Spiritual Life,Love Revealed in Death,1
7.14,ህይወት ወይስ ሞት,,Spiritual Life,Life or Death,1
7.15,ያለፈው ይበቃኛል,,Spiritual Life,The Past is Enough,2
7.16,የአንድነት ኃይል,,Spiritual Life,The Power of Unity,2
7.17,መንፈሳዊ ህይወት ምንድን ነው,,Spiritual Life,What is Spiritual Life?,2
7.18,ለቁርባን እንድበቃ ምን ላድርግ,,Spiritual Life,What to do to be worthy of Communion,2
7.19,መልካም እረኛ,,Spiritual Life,The Good Shepherd,2
7.2,ጉዞ ወደ እግዚአብሔር,,Spiritual Life,Journey to God,1
7.21,እረኛ ወይስ ምንደኛ,,Spiritual Life,Shepherd or Hireling,1
7.22,ፍኖተ ቅዱሳን,,Spiritual Life,Way of the Saints,1
7.23,የንስሃ አባት,,Spiritual Life,Father of Confession (Note: Door of Repentance),1
7.24,የማምለጫው በር,,Spiritual Life,The Escape Door,1
7.25,ጸሎተ ንስሃና ተመለሱ,,Spiritual Life,Prayer of Repentance & Return,1
7.26,ኃጢአቷን ያቀረበች ማርያም,,Spiritual Life,Mary who presented her sin,1
7.27,አትፍረድ,,Spiritual Life,Do not Judge,1
7.28,መንፈሳዊነት ከሌሎች ጋር ሰው ጋር,,Spiritual Life,Spirituality with Others,1
7.29,ፍኖተ ክርስትና,,Spiritual Life,Way of Christianity,1
7.3,ምክር ለወዳጅ,,Spiritual Life,Advice for a Friend,1
7.31,እምነታችን ይህ ነው,,Spiritual Life,This is Our Faith,1
7.32,ጾምና ምጽዋት,,Spiritual Life,Fasting & Alms,1
7.33,የተስፋ ህይወት,,Spiritual Life,Life of Hope,1
7.34,ወደ እግዚአብሔር መመለስ,,Spiritual Life,Returning to God,1
7.35,የህይወት ምሥጢር,,Spiritual Life,Secret of Life,1
7.36,ምን ያስፈልጋችኋል,,Spiritual Life,What do you need?,1
7.37,የሚለውጥ ፍቅር,,Spiritual Life,Changing Love,1
7.38,የአመጋገባችን ጉዞ ከገሊላ ወደ ግብፅ,,Spiritual Life,Our Eating Journey from Galilee to Egypt,1
7.39,እነሆ እናትህ,,Spiritual Life,Behold your Mother,1
7.4,የዘላለም እሳት,,Spiritual Life,Eternal Fire,1
7.41,በኃጢአት እንደ በድንግል ማርያም አልፍርም,,Spiritual Life,I am not ashamed of sin as in Virgin Mary?,1
7.42,ለምን ኦርቶዶክሳዊ ሆንኩ,,Spiritual Life,Why I became Orthodox,1
7.43,እንደዚህ ብላችሁ ጸልዩ,,Spiritual Life,Pray Like This,1
7.44,ክርክዴን,,Spiritual Life,Kirkden?,1
7.45,የተረጋጋ ህይወት,,Spiritual Life,Peaceful Life,1
7.46,የነፍስ አርነት,,Spiritual Life,Freedom of Soul,1
7.47,ፈቃደ እግዚአብሔር በምን እንዴት ይታወቃል,,Spiritual Life,How is God's Will Known?,1
7.48,ወጣትነት እና የቅድስና ህይወት,,Spiritual Life,Youth & Holy Life,1
7.49,መንፈሳዊ ጾም,,Spiritual Life,Spiritual Fasting,1
7.5,የቅዳሴ ሥርዓት ትርጉም,,Spiritual Life,Meaning of Liturgy Order,1
7.51,ህሌና,,Spiritual Life,Conscience,1
7.52,የበረከት ሸለቆ,,Spiritual Life,Valley of Blessing,1
7.53,የእምነት ህይወት,,Spiritual Life,Life of Faith,3
7.54,ያለፈውን ዘመን ይበቃል,,Spiritual Life,The Past Time is Enough,2
7.55,የጾም በረከቶች,,Spiritual Life,Blessings of Fasting,1
7.56,መራራ ቅጣት,,Spiritual Life,Bitter Punishment,1
7.57,የመንፈሳዊ አገልግሎት,,Spiritual Life,Spiritual Service,1
7.58,ከሰዶማውያን ክርስትና ተጠብቁ,,Spiritual Life,Beware of Sodomite Christianity,1
7.59,ኦርቶዶክሳዊ መንፈሳዊነት,,Spiritual Life,Orthodox Spirituality,1
8,የጋብቻ መጻሕፍት,,Marriage,Marriage Books,2
8.1.1,ትንሣኤ ጋብቻ,,Marriage,Resurrection of Marriage,1
8.1.2,ከጋብቻ በኋላ ጽሑፍ,,Marriage,Post-Marriage Text,1
8.1.3,ጥንታዊ ጋብቻ በዘመናዊ አቀራረብ,,Marriage,Ancient Marriage in Modern Approach,1
8.1.4,መጽሐፈ ግስ ወሰዋስው,,Marriage,Book of Verbs & Grammar (Maybe miscategorized in source),5
8.1.5,ዘጠኙ የጋብቻ ፊደላት,,Marriage,The 9 Letters of Marriage,1
8.2,ትዳር ክን መጻሕፍት,,Marriage Counseling,Marriage Counseling/Success Books,2
8.2.1,ጋብቻን ከማን ጋር ልፈጽም,,Marriage Counseling,Who Should I Marry?,1
8.2.2,ወጣትነት እውነተኛ ፍቅርና የጋብቻ ህይወት,,Marriage Counseling,Youth True Love & Marriage Life,2
8.2.3,የትዳር አንድምታ,,Marriage Counseling,Commentary on Marriage,1
8.2.4,ክርስትያናዊ ጋብቻ,,Marriage Counseling,Christian Marriage,1
8.2.5,ትዳርና የቤተሰብ ህይወት,,Marriage Counseling,Marriage & Family Life,1
8.2.6,የወጣቶች ኦርቶዶክሳዊ ህይወት,,Marriage Counseling,Youth Orthodox Life,1
8.2.7,ከማምለክ ጋር ጋብቻ,,Marriage Counseling,Marriage with Worship?,2
8.2.8,ትዳርና ሕገ ተፈጥሮ,,Marriage Counseling,Marriage & Natural Law,3
8.2.9,የትዳር ፈተናዎችና መፍትሔዎቻቸው,,Marriage Counseling,Marriage Challenges & Solutions,1
8.2.10,THE ORDER MARRIAGE,,Marriage Counseling,The Order of Marriage,2
9,ፍልስፍናና ስነልቦና መጻሕፍት,,Philosophy/Psychology,Philosophy & Psychology Books,2
9.1,ሰብአ,,Philosophy/Psychology,Seba (Human?),2
9.2,ዝክረ,,Philosophy/Psychology,Zikre (Remembrance),1
9.3,አሉታዊና አወንታዊ አዕሮ,,Philosophy/Psychology,Negative & Positive Mind,2
9.4,የኢልቦራን በረከቶች,,Philosophy/Psychology,Blessings of Ilboran?,1
9.5,ብዞዎችና ጥቂቶች,,Philosophy/Psychology,The Many & The Few,1
9.6,ዓለም አቀፍ ወላጆች,,Philosophy/Psychology,International Parents,1
9.7,የጠ/ቤ ትንሳኤና የተናጋሪች ጥበብ,,Philosophy/Psychology,Palace Resurrection & Speaker Wisdom?,1
9.8,ከሞት ጋር ቀጠሮ,,Philosophy/Psychology,Appointment with Death,1
9.9,እንዴትና ምን ብዬ ልናገር,,Philosophy/Psychology,How & What Should I Say?,1
9.1,የነገደው ስነ ምግባራት 1,,Philosophy/Psychology,Trader's Ethics 1?,1
9.11,ታሪክ ነጋሪ የመንገድ መሪ,,Philosophy/Psychology,History Teller Road Guide,1
9.12,ታቦተ ጽዮን ፍለጋ,,Philosophy/Psychology,Searching for Ark of Zion,1
9.13,ሚፈጠሩና ወርቃማ ጥቅሶች,,Philosophy/Psychology,Created & Golden Quotes,1
9.14,ክርበ,,Philosophy/Psychology,Kirbe?,2
9.15,ብኩለ አበው,,Philosophy/Psychology,Bikule Abew,1
9.16,የሰንበት ኃይል,,Philosophy/Psychology,The Power of Sabbath,1
9.17,ከህይወት ጋር የተደረገ ቃለ መጠይቅ,,Philosophy/Psychology,Interview with Life,1
9.18,የ2 ሐውልቶች ወግ,,Philosophy/Psychology,Tale of 2 Statues,1
9.19,አመራር,,Philosophy/Psychology,Leadership,1
9.2,ቅኔ ዘፍሬ ምናኔ,,Philosophy/Psychology,Kine Zefre Minane,1
9.21,ምዕራብ,,Philosophy/Psychology,West,1
9.22,አናቅጽ ሲኦል,,Philosophy/Psychology,Gates of Hell,1
9.23,የማይሞት ስም,,Philosophy/Psychology,Immortal Name,1
9.24,የሰይጣን ጥፍሮች,,Philosophy/Psychology,Satan's Claws,1
9.25,የሰብሻ ርስት,,Philosophy/Psychology,Sebsha's Inheritance?,1
9.26,መክሊት,,Philosophy/Psychology,Talent,1
9.27,የክዳት ኃይላት,,Philosophy/Psychology,Forces of Betrayal,1
9.28,ራስህን የመለወጥ ምሥጢር,,Philosophy/Psychology,Secret of Changing Yourself,1
9.29,አፍሮአዊ ፈረስ,,Philosophy/Psychology,African Horse,1
9.3,ለኢ/ያ ታሪክ ተጠያቂ ማነው,,Philosophy/Psychology,Who is Responsible for Eth History,1
9.31,የበረሃ አባቶች ምክር,,Philosophy/Psychology,Advice of Desert Fathers,1
9.32,የቁን እንቀበል,,Philosophy/Psychology,Let's Accept...?,1
9.33,11ኛው ሰዓት,,Philosophy/Psychology,The 11th Hour,1
9.34,አሳድጎች,,Philosophy/Psychology,Growers/Guardians,1
9.35,የለለውን ፋላሳ ፍለጋ,,Philosophy/Psychology,Searching for the missing Falasha?,1
9.36,ኢደተ ግህዘን,,Philosophy/Psychology,Idete Gihzen?,1
9.37,ምጣኔ ቀመጥ,,Philosophy/Psychology,Mitane Kemet?,1
9.38,ሙሴ,,Philosophy/Psychology,Moses,1
9.39,የእግዚአብሔር ዕቅድና በአንድነት,,Philosophy/Psychology,God's Plan & Unity,1
9.4,አልራራ - ፊል ኦፍ ዘ ሪንግ,,Philosophy/Psychology,Alrara - Phil of the Ring?,1
10,የስነጽሁፍ መረጃ መጻሕፍት,,Literature/Reference,Literature Reference Books,1
10.1,ግብብና ዕውቀት ለልጆች,,Literature/Reference,Relationships & Knowledge for Kids,2
10.2,አዳምና ሌሎቹ,,Literature/Reference,Adam and Others,1
10.2,አባ ግርማ ዘጋበሪ,,Literature/Reference,Aba Girma Zegaberi (Duplicate code),1
10.3,ጣጣው በገበበ ገበታ,,Literature/Reference,Trouble in...?,1
10.4,ተዓምረኛው እንንት,,Literature/Reference,Miraculous...?,1
10.5,የኢ/ያ ቆዳን አባቶች ታሪኮች,,Literature/Reference,Eth Skin Fathers Stories?,1
10.6,9ኙ በዓላት,,Literature/Reference,The 9 Feasts,2
10.7,የሰው ሁሉ መጨረሻ,,Literature/Reference,End of All Men,2
10.8,ጠቢል,,Literature/Reference,Tebil,7
10.9,መሠረተ ህይወት ጥራዝ,,Literature/Reference,Foundation of Life Vol,5
11,የታሪክ መጻሕፍት,,History,History Books,2
11.1,ገከረ ቅዱሳን ዘተዋህዶ,,History,Gekere Saints of Tewahedo,2
11.2,ገከረ ሊቃውንት ሳልሳይ,,History,Gekere Scholars Third,1
11.3,ገከረ ሊቃውንት ካልዕ,,History,Gekere Scholars Second,3
11.4,መዝገበ ቅዱሳን,,History,Dictionary of Saints,1
11.5,መዝገበ ታሪክ ክፍል 1,,History,History Dictionary Part 1,1
11.6,መዝገበ ታሪክ ክፍል 2,,History,History Dictionary Part 2,3
11.7,ዜና አይሁድ,,History,History of Jews,5
11.8,የዛሬዋ ኢ/ያ በመጽሐፍ ቅዱስ,,History,Today's Ethiopia in the Bible,2
11.9,ገድለ ዓለም ታሪክ,,History,World History,1
11.1,ሀብተ ጊዮርጊስ,,History,Habte Giorgis,1
11.11,የቤ/ያን ታሪክ ቅጽ 1 በመ/ር ግርማ ባቱ,,History,Church History Vol 1 by Merigeta Girma Batu,1
11.12,ሀገረ እግዚአብሔር ኢ/ያ በመጽሐፍ ቅዱስ,,History,God's Country Ethiopia in Bible,1
11.13,የሰብኪ ቅዱሳን መድረክ ዓለም ገዳም ታሪክ,,History,Preacher Saints Platform World Monastery History,1
11.14,ታሪክና ምሳሌ,,History,History & Example,2
11.15,የሮማ ቅ/ማርቆስ ገዳም ታሪክ,,History,Rome St. Mark Monastery History,1
11.16,የአዳዲ ማርያም ገዳም ታሪክ,,History,Adadi Mariam Monastery History,1
11.17,ደቂቅ ሥራውን መስክሩ,,History,Minors testify his work,1
11.18,ገከረ ሊተን,,History,Gekere Liten?,1
11.19,የአርባ ሐራ መድኃኒዓለም ገዳም ታሪክ,,History,Arba Hara Medhanialem Monastery History,1
11.2,ደብረ ዘይት ቅ/አርሴማ ገዳም,,History,Debre Zeit St. Arsema Monastery,1
11.21,የናግራን ሰማዕታት,,History,Nagran Martyrs,2
11.22,THE MEANING OF QUINE,,History,The Meaning of Quine,1
11.23,THE HISTORY OF ETHIOPIAN ORTHODOX CHURCH,,History,The History of Ethiopian Orthodox Church,1
12,የጸሎት መጻሕፍት,,Prayer,Prayer Books,1
12.1,የአምላክ እናት,,Prayer,Mother of God,1
12.2,የቅዳሴ ጸሎት,,Prayer,Liturgy Prayer,2
12.3,መልክአ ኤርምያስ,,Prayer,Melka Erimias,2
12.4,ጸሎተ ስልስ,,Prayer,Prayer of Trinity,2
12.5,ምስጋና ህይወት,,Prayer,Thanksgiving Life,3
12.6,ሰንበ ለነ ቅድስት,,Prayer,Senbe Lene Kidist,1
12.7,የሃይማኖት ጸሎት,,Prayer,Prayer of Faith,1
12.8,ሥርዓተ ቅዳሴ ምስለ ግብረ ዲያቆናት,,Prayer,Liturgy Order with Deacon Acts,1
12.9,ጸሎተ ቅዳሴ በአማርኛ,,Prayer,Liturgy Prayer in Amharic,1
12.1,የሰይጣን ማባረሪያ,,Prayer,Satan Expeller,1
12.11,መልክአ አርሰማ,,Prayer,Melka Arsema,1
12.12,የዘወትር ጸሎት,,Prayer,Daily Prayer,1
12.13,ቅ/አርሴማ ሰማዕት,,Prayer,St. Arsema Martyr,20
12.14,መጽሐፍ ቅዱስ ትንሽ,,Prayer,Bible (Small),1
13,ልዩ ልዩ,,Miscellaneous,Miscellaneous,1
13.1,አክራሪ እስልምናና በኢ/ያ,,Miscellaneous,Radical Islam in Ethiopia,1
13.2,የተሃድሶ ፕሮቴስታንቶች የአማኞች መህልጫ,,Miscellaneous,Reformist Protestants...,1
13.3,ኦርቶዶክስ ተዋህዶ,,Miscellaneous,Orthodox Tewahedo,3
13.4,ክርስትና ቤ/ያን,,Miscellaneous,Christian Church,1
13.5,ሐመር ተዋህዶ,,Miscellaneous,Hamer Tewahedo,2
13.6,መጽሐፍ ቅዱስ ተርጓሚያን,,Miscellaneous,Bible Interpreters,4
13.7,የተሃድሶ መናፍቃን ዘመቻ በኢ/ያ ቤ/ክ,,Miscellaneous,Reformist Heretics Campaign in Eth Church,9
13.8,መጽሐፈ ተልዕኮ,,Miscellaneous,Book of Mission,1
13.9,ለሚጠይቋችሁ ሁሉ,,Miscellaneous,To All Who Ask You,1
13.1,ቶኑቶር,,Miscellaneous,Tonutor?,1
13.11,መናፍቃነት በዓለም,,Miscellaneous,Heresy in the World,2
13.12,ባለውለታዬ,,Miscellaneous,My Benefactor,2
13.13,ቅዱስ ገብርኤል /ቁልቢ/,,Miscellaneous,St. Gabriel /Kulubi/,4
13.14,የየሆዋ ምስክሮች ነፋቃ,,Miscellaneous,Jehovah's Witnesses Heresy,18
13.15,ገከረ ጽዮን,,Miscellaneous,Gekere Zion,1
13.16,በትር አሮን/ኦሮን,,Miscellaneous,Rod of Aaron,81
13.17,ሐመር መጽሔት ልዩ ልዩ እትም,,Miscellaneous,Hamer Magazine Special Edition,1
13.18,የቤ/ክ አስተዳደራዊ መዋቅር,,Miscellaneous,Church Admin Structure,1
13.19,ሕገ መንግስት,,Miscellaneous,Constitution,1
13.2,መሪ አሽከርካሪዎች ማሰልጠኛ መጽሐፍ,,Miscellaneous,Drivers Training Book,1
13.21,ወንጌል ዮሐንስ /ትንሹ/,,Miscellaneous,Gospel of John (Small),4`;

function parseBooksFromCSV(csvText: string) {
  const lines = csvText.trim().split('\n');
  const books = [];
  
  // Skip header row (first line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by comma, but handle quoted fields if needed
    const parts = line.split(',');
    if (parts.length < 6) continue;
    
    const book_code = parts[0]?.trim();
    const title = parts[1]?.trim();
    const author = parts[2]?.trim() || '';
    const category = parts[3]?.trim();
    let notes = parts[4]?.trim() || '';
    const copiesStr = parts[5]?.trim();
    
    // Handle any additional commas in notes by joining remaining parts
    if (parts.length > 6) {
      notes = parts.slice(4, parts.length - 1).join(',').trim();
    }
    
    const copies = parseInt(copiesStr) || 1;
    
    if (book_code && title) {
      // Remove duplicate codes by keeping first occurrence
      // We'll track duplicates in a Set
      books.push({
        book_code,
        title,
        author,
        category,
        notes,
        copies,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'synced'
      });
    }
  }
  
  // Remove duplicates based on book_code
  const uniqueBooks = [];
  const seenCodes = new Set();
  
  for (const book of books) {
    if (!seenCodes.has(book.book_code)) {
      seenCodes.add(book.book_code);
      uniqueBooks.push(book);
    }
  }
  
  return uniqueBooks;
}

export async function postActivate(payload: ActivatePayload) {
  if (!ONLINE) {
    // mocked behaviour:
    // Accept DiguwaSoft / 1366 or any username that starts with "lib" for demo
    const { username, pin, device_id } = payload;

    // demo validation logic:
    if (username === "DiguwaSoft" && pin === "1366") {
      const salt = generateSalt();
      const hash = await hashPin(pin, salt);
      
      // Parse books from CSV
      const booksFromCSV = parseBooksFromCSV(BOOK_INVENTORY_CSV);
      
      return {
        ok: true,
        role: "admin",
        require_pin_change: true,
        last_pulled_commit: "init-0001",
        snapshot: mockSnapshot([
          {
            username: "DiguwaSoft",
            full_name: "Diguwa Soft Admin",
            role: "admin",
            pin_salt: salt,
            pin_hash: hash,
            device_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted: 0,
          },
        ], booksFromCSV),
      };
    }

    // simulate: if username startsWith lib and pin === '0000' allow activation with require_pin_change true
    if (username.toLowerCase().startsWith("lib") && (pin === "0000" || pin === "1234")) {
      const salt = generateSalt();
      const hash = await hashPin(pin, salt);
      
      // Parse books from CSV
      const booksFromCSV = parseBooksFromCSV(BOOK_INVENTORY_CSV);
      
      return {
        ok: true,
        role: "librarian",
        require_pin_change: true,
        last_pulled_commit: "init-0001",
        snapshot: mockSnapshot([
          {
            username: username,
            full_name: "Demo Librarian",
            role: "librarian",
            pin_salt: salt,
            pin_hash: hash,
            device_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted: 0,
          },
        ], booksFromCSV),
      };
    }

    return { ok: false, reason: "invalid_username_or_pin" };
  }

  // real mode - implement your real endpoint here
  try {
    const res = await fetch("https://your-server.com/auth/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, reason: `server:${res.status}` };
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, reason: err.message || "network_error" };
  }
}

/** Mock snapshot shape — adjust to match your real snapshot */
function mockSnapshot(librariansOverride?: any[], booksOverride?: any[]) {
  // Parse books from CSV if not provided
  const books = booksOverride || parseBooksFromCSV(BOOK_INVENTORY_CSV);
  
  const baseLibrarians = librariansOverride ?? [
    {
      username: "DiguwaSoft",
      full_name: "Diguwa Soft Admin",
      role: "admin",
      pin_salt: "srv-salt",
      pin_hash: "srv-hash",
      device_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted: 0,
    },
    {
      username: "lib1",
      full_name: "Demo Librarian",
      role: "librarian",
      pin_salt: "srv-salt",
      pin_hash: "srv-hash",
      device_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted: 0,
    },
  ];

  return {
    books,
    users: [
      { fayda_id: "user-1", name: "Test User", phone: "0912345678", photo_uri: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: "synced" },
    ],
    librarians: baseLibrarians,
    commits: [],
  };
} 