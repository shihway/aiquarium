/**
 * species-lookup.js
 *
 * 롯데 아쿠아리움 법정관리종 조회 로직. original.html에서 추출한 순수 로직 모듈로,
 * 브라우저(original.html, agent.html)와 Node 서버(server.js) 양쪽에서 공유한다.
 *
 * UMD 모듈: Node에서는 require()로, 브라우저에서는 window.SpeciesLookup으로 접근.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SpeciesLookup = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ------------------------------------------------------------------
    // 출처(source) 상수
    // ------------------------------------------------------------------
    var SOURCE_CITES = 'CITES Species+ API (실시간, api.speciesplus.net)';
    var SOURCE_KR_ENDANGERED = '환경부 공공데이터포털 API (실시간, api.odcloud.kr)';
    var SOURCE_STATIC = '내부 정적 데이터(original.html 기준), 최신 고시와 다를 수 있음';

    // ------------------------------------------------------------------
    // 정적 데이터 (original.html에서 그대로 추출, 값 변경 없음)
    // ------------------------------------------------------------------
        const marineProtectedData = [
            { scientific_raw: "Eschrichtius robustus" },
            { scientific_raw: "Tursiops aduncus" },
            { scientific_raw: "Balaenoptera musculus" },
            { scientific_raw: "Balaenoptera borealis" },
            { scientific_raw: "Eubalaena japonica" },
            { scientific_raw: "Balaenoptera edeni" },
            { scientific_raw: "Neophocaena asiaeorientalis" },
            { scientific_raw: "Balaenoptera physalus" },
            { scientific_raw: "Physeter macrocephalus" },
            { scientific_raw: "Megaptera novaeangliae" },
            { scientific_raw: "Orcinus orca" },
            { scientific_raw: "Pseudorca crassidens" },
            { scientific_raw: "Tursiops truncatus" },
            { scientific_raw: "Lagenorhynchus obliquidens" },
            { scientific_raw: "Delphinus delphis" },
            { scientific_raw: "Pusa hispida" },
            { scientific_raw: "Histriophoca fasciata" },
            { scientific_raw: "Phoca largha" },
            { scientific_raw: "Callorhinus ursinus" },
            { scientific_raw: "Zalophus japonicus" },
            { scientific_raw: "Eumetopias jubatus" },
            { scientific_raw: "Chasmagnathus convexus" },
            { scientific_raw: "Pseudohelice subquadrata" },
            { scientific_raw: "Scopimera bitympana" },
            { scientific_raw: "Ocypode stimpsoni" },
            { scientific_raw: "Parasesarma bidens" },
            { scientific_raw: "Sesarmops intermedius" },
            { scientific_raw: "Austruca lactea" },
            { scientific_raw: "Scopimera longidactyla" },
            { scientific_raw: "Nacospatangus altus" },
            { scientific_raw: "Clithon retropictum" },
            { scientific_raw: "Charonia lampas" },
            { scientific_raw: "Ellobium chinense" },
            { scientific_raw: "Tubastraea coccinea" },
            { scientific_raw: "Euplexaura crassa" },
            { scientific_raw: "Echinogorgia reticulata" },
            { scientific_raw: "Dichopsammia granulosa" },
            { scientific_raw: "Ellisella ceratophyta" },
            { scientific_raw: "Plumarella spinosa" },
            { scientific_raw: "Dendrophyllia cribrosa" },
            { scientific_raw: "Dendrophyllia ijimai" },
            { scientific_raw: "Plumarella adhaerans" },
            { scientific_raw: "Echinogorgia complexa" },
            { scientific_raw: "Dendronephthya suensoni" },
            { scientific_raw: "Dendronephthya castanea" },
            { scientific_raw: "Dendronephthya mollis" },
            { scientific_raw: "Dendronephthya putteri" },
            { scientific_raw: "Dendronephthya alba" },
            { scientific_raw: "Chromonephthea hirotai" },
            { scientific_raw: "Myriopathes lata" },
            { scientific_raw: "Antipathes dubia" },
            { scientific_raw: "Antipathes densa" },
            { scientific_raw: "Cirrhipathes anguina" },
            { scientific_raw: "Myriopathes japonica" },
            { scientific_raw: "Ophiacantha linea" },
            { scientific_raw: "Synandwakia multitentaculata" },
            { scientific_raw: "Paraleonnates uschakovi" },
            { scientific_raw: "Eretmochelys imbricata" },
            { scientific_raw: "Caretta caretta" },
            { scientific_raw: "Dermochelys coriacea" },
            { scientific_raw: "Chelonia mydas" },
            { scientific_raw: "Lepidochelys olivacea" },
            { scientific_raw: "Rhincodon typus" },
            { scientific_raw: "Sphyrna lewini" },
            { scientific_raw: "Hippocampus histrix" },
            { scientific_raw: "Hippocampus kuda" },
            { scientific_raw: "Hippocampus trimaculatus" },
            { scientific_raw: "Hippocampus haema" }
        ];

        // 국외반출승인대상생물자원 내장 데이터
        const exportApprovalData = [
            { group: "어류", family_kr: "꺽지과", family_latin: "Centropomidae", common_kr: "꺽지", scientific_raw: "Coreoperca herzi", note: "" },
            { group: "어류", family_kr: "동사리과", family_latin: "Odontobutidae", common_kr: "좀구굴치", scientific_raw: "Micropercops swinhonis", note: "" },
            { group: "어류", family_kr: "동사리과", family_latin: "Odontobutidae", common_kr: "얼록동사리", scientific_raw: "Odontobutis interrupta", note: "" },
            { group: "어류", family_kr: "동사리과", family_latin: "Odontobutidae", common_kr: "동사리", scientific_raw: "Odontobutis platycephala", note: "" },
            { group: "어류", family_kr: "동자개과", family_latin: "Bagridae", common_kr: "눈동자개", scientific_raw: "Pseudobagrus koreanus", note: "" },
            { group: "어류", family_kr: "돛양태과", family_latin: "Callionymidae", common_kr: "참돛양태", scientific_raw: "Repomucenus koreanus", note: "" },
            { group: "어류", family_kr: "돛양태과", family_latin: "Callionymidae", common_kr: "흰점양태", scientific_raw: "Repomucenus leucopoecilus", note: "" },
            { group: "어류", family_kr: "돛양태과", family_latin: "Callionymidae", common_kr: "강주걱양태", scientific_raw: "Repomucenus olidus", note: "" },
            { group: "어류", family_kr: "둑중개과", family_latin: "Cottidae", common_kr: "둑중개", scientific_raw: "Cottus koreanus", note: "" },
            { group: "어류", family_kr: "둑중개과", family_latin: "Cottidae", common_kr: "꺽정이", scientific_raw: "Trachidermus fasciatus", note: "" },
            { group: "어류", family_kr: "드렁허리과", family_latin: "Synbranchidae", common_kr: "드렁허리", scientific_raw: "Monopterus albus", note: "" },
            { group: "어류", family_kr: "망둑어과", family_latin: "Gobiidae", common_kr: "점줄망둑", scientific_raw: "Acentrogobius pellidebilis", note: "" },
            { group: "어류", family_kr: "망둑어과", family_latin: "Gobiidae", common_kr: "짱뚱어", scientific_raw: "Boleophthalmus pectinirostris", note: "" },
            { group: "어류", family_kr: "망둑어과", family_latin: "Gobiidae", common_kr: "날망둑", scientific_raw: "Gymnogobius breunigii", note: "" },
            { group: "어류", family_kr: "망둑어과", family_latin: "Gobiidae", common_kr: "사백어", scientific_raw: "Leucopsarion petersii", note: "" },
            { group: "어류", family_kr: "망둑어과", family_latin: "Gobiidae", common_kr: "제주모치망둑", scientific_raw: "Mugilogobius fontinalis", note: "" },
            { group: "어류", family_kr: "망둑어과", family_latin: "Gobiidae", common_kr: "큰볏말뚝망둥어", scientific_raw: "Periophthalmus magnuspinnatus", note: "" },
            { group: "어류", family_kr: "망둑어과", family_latin: "Gobiidae", common_kr: "말뚝망둥어", scientific_raw: "Periophthalmus modestus", note: "" },
            { group: "어류", family_kr: "메기과", family_latin: "Siluridae", common_kr: "미유기", scientific_raw: "Silurus microdorsalis", note: "" },
            { group: "어류", family_kr: "미꾸리과", family_latin: "Cobitidae", common_kr: "기름종개", scientific_raw: "Cobitis hankugensis", note: "" },
            { group: "어류", family_kr: "미꾸리과", family_latin: "Cobitidae", common_kr: "점줄종개", scientific_raw: "Cobitis nalbanti", note: "현행화" },
            { group: "어류", family_kr: "미꾸리과", family_latin: "Cobitidae", common_kr: "줄종개", scientific_raw: "Cobitis tetralineata", note: "" },
            { group: "어류", family_kr: "미꾸리과", family_latin: "Cobitidae", common_kr: "남방종개", scientific_raw: "Iksookimia hugowolfeldi", note: "" },
            { group: "어류", family_kr: "미꾸리과", family_latin: "Cobitidae", common_kr: "참종개", scientific_raw: "Iksookimia koreensis", note: "" },
            { group: "어류", family_kr: "미꾸리과", family_latin: "Cobitidae", common_kr: "왕종개", scientific_raw: "Iksookimia longicorpa", note: "" },
            { group: "어류", family_kr: "미꾸리과", family_latin: "Cobitidae", common_kr: "북방종개", scientific_raw: "Iksookimia pacifica", note: "" },
            { group: "어류", family_kr: "미꾸리과", family_latin: "Cobitidae", common_kr: "동방종개", scientific_raw: "Iksookimia yongdokensis", note: "" },
            { group: "어류", family_kr: "미꾸리과", family_latin: "Cobitidae", common_kr: "수수미꾸리", scientific_raw: "Kichulchoia multifasciata", note: "" },
            { group: "어류", family_kr: "미꾸리과", family_latin: "Cobitidae", common_kr: "새코미꾸리", scientific_raw: "Koreocobitis rotundicaudata", note: "" },
            { group: "어류", family_kr: "바다뱀과", family_latin: "Ophichthidae", common_kr: "둥근물뱀", scientific_raw: "Ophisurus rotundus", note: "" },
            { group: "어류", family_kr: "바다빙어과", family_latin: "Osmeridae", common_kr: "젓뱅어", scientific_raw: "Neosalanx jordani", note: "" },
            { group: "어류", family_kr: "버들붕어과", family_latin: "Belontiidae", common_kr: "버들붕어", scientific_raw: "Macropodus ocellatus", note: "" },
            { group: "어류", family_kr: "송사리과", family_latin: "Adrianichthyidae", common_kr: "송사리", scientific_raw: "Oryzias latipes", note: "" },
            { group: "어류", family_kr: "송사리과", family_latin: "Adrianichthyidae", common_kr: "대륙송사리", scientific_raw: "Oryzias sinensis", note: "" },
            { group: "어류", family_kr: "연어과", family_latin: "Salmonidae", common_kr: "자치", scientific_raw: "Hucho ishikawae", note: "" },
            { group: "어류", family_kr: "연어과", family_latin: "Salmonidae", common_kr: "사루기", scientific_raw: "Thymallus arcticus yaluensis", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "버들매치", scientific_raw: "Abbottina rivularis", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "왜매치", scientific_raw: "Abbottina springeri", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "가시납지리", scientific_raw: "Acheilognathus chankaensis", note: "현행화" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "칼납자루", scientific_raw: "Acheilognathus koreensis", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "납자루", scientific_raw: "Acheilognathus lanceolata intermedia", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "큰납지리", scientific_raw: "Acheilognathus macropterus", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "납지리", scientific_raw: "Acheilognathus rhombeus", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "줄납자루", scientific_raw: "Acheilognathus yamatsutae", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "왜몰개", scientific_raw: "Aphyocypris chinensis", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "쉬리", scientific_raw: "Coreoleuciscus splendidus", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "줄몰개", scientific_raw: "Gnathopogon strigatus", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "참마자", scientific_raw: "Hemibarbus longirostris", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "어름치", scientific_raw: "Hemibarbus mylodon", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "치리", scientific_raw: "Hemiculter eigenmanni", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "살치", scientific_raw: "Hemiculter leucisculus", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "새미", scientific_raw: "Ladislavia taczanowskii", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "압록자그사니", scientific_raw: "Mesogobio lachneri", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "두만강자그사니", scientific_raw: "Mesogobio tumensis", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "됭경모치", scientific_raw: "Microphysogobio jeoni", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "배가사리", scientific_raw: "Microphysogobio longidorsalis", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "돌마자", scientific_raw: "Microphysogobio yaluensis", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "모래무지", scientific_raw: "Pseudogobio esocinus", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "서호납줄갱이", scientific_raw: "Rhodeus hondae", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "떡납줄갱이", scientific_raw: "Rhodeus notatus", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "흰줄납줄개", scientific_raw: "Rhodeus ocellatus", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "각시붕어", scientific_raw: "Rhodeus uyekii", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "금강모치", scientific_raw: "Rhynchocypris kumgangensis", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "버들개", scientific_raw: "Rhynchocypris steindachneri", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "중고기", scientific_raw: "Sarcocheilichthys nigripinnis morii", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "참중고기", scientific_raw: "Sarcocheilichthys variegatus wakiyae", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "두우쟁이", scientific_raw: "Saurogobio dabryi", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "참몰개", scientific_raw: "Squalidus chankaensis tsuchigae", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "긴몰개", scientific_raw: "Squalidus gracilis majimae", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "몰개", scientific_raw: "Squalidus japonicus coreanus", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "점몰개", scientific_raw: "Squalidus multimaculatus", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "눈불개", scientific_raw: "Squaliobarbus curriculus", note: "" },
            { group: "어류", family_kr: "잉어과", family_latin: "Cyprinidae", common_kr: "참갈겨니", scientific_raw: "Zacco koreanus", note: "" },
            { group: "어류", family_kr: "장갱이과", family_latin: "Stichaeidae", common_kr: "우베도라치", scientific_raw: "Zoarchias uchidai", note: "" },
            { group: "어류", family_kr: "종개과", family_latin: "Balitoridae", common_kr: "쌀미꾸리", scientific_raw: "Lefua costata", note: "" },
            { group: "어류", family_kr: "종개과", family_latin: "Balitoridae", common_kr: "대륙종개", scientific_raw: "Orthrias nudus", note: "" },
            { group: "어류", family_kr: "종개과", family_latin: "Balitoridae", common_kr: "종개", scientific_raw: "Orthrias toni", note: "" },
            { group: "어류", family_kr: "칠성장어과", family_latin: "Petromyzontidae", common_kr: "칠성말배꼽", scientific_raw: "Lethenteron morii", note: "" },
            { group: "어류", family_kr: "큰가시고기과", family_latin: "Gasterosteidae", common_kr: "잔가시고기", scientific_raw: "Pungitius kaibarae", note: "" },
            { group: "어류", family_kr: "퉁가리과", family_latin: "Amblycipitidae", common_kr: "퉁가리", scientific_raw: "Liobagrus andersoni", note: "" },
            { group: "어류", family_kr: "퉁가리과", family_latin: "Amblycipitidae", common_kr: "자가사리", scientific_raw: "Liobagrus mediadiposalis", note: "" },
            { group: "어류", family_kr: "퉁가리과", family_latin: "Amblycipitidae", common_kr: "섬진자가사리", scientific_raw: "Liobagrus somjinensis", note: "" }
        ];

        // 유입주의생물 내장 데이터
        const invasiveAlienSpeciesData = [
            { scientific_raw: "Micropterus dolomieu", common_kr: "작은입배스" },
            { scientific_raw: "Siniperca chuatsi", common_kr: "중국쏘가리" },
            { scientific_raw: "Gambusia affinis", common_kr: "모기송사리" },
            { scientific_raw: "Esox lucius", common_kr: "북방민물꼬치고기" },
            { scientific_raw: "Channa striata", common_kr: "줄가물치" },
            { scientific_raw: "Neogobius melanostomus", common_kr: "유럽둥근망둑" },
            { scientific_raw: "Perca fluviatilis", common_kr: "유라시아민물농어" },
            { scientific_raw: "Clarias gariepinus", common_kr: "북아프리카동자개" },
            { scientific_raw: "Piaractus brachypomus", common_kr: "붉은파쿠" },
            { scientific_raw: "Atractosteus spatula", common_kr: "엘리게이터가" },
            { scientific_raw: "Phractocephalus hemioliopterus", common_kr: "남미붉은꼬리동자개" },
            { scientific_raw: "Maccullochella peelii", common_kr: "호주민물대구" },
            { scientific_raw: "Alosa sapidissima", common_kr: "아메리카청어" },
            { scientific_raw: "Alosa pseudoharengus", common_kr: "회색청어" },
            { scientific_raw: "Amia calva", common_kr: "보핀" },
            { scientific_raw: "Sander lucioperca", common_kr: "파이크농어" },
            { scientific_raw: "Ictiobus cyprinellus", common_kr: "큰입북미잉어" },
            { scientific_raw: "Ictiobus niger", common_kr: "검은북미잉어" },
            { scientific_raw: "Labeo rohita", common_kr: "큰입술잉어" },
            { scientific_raw: "Lepomis cyanellus", common_kr: "초록블루길" },
            { scientific_raw: "Lepomis megalotis", common_kr: "긴귀블루길" },
            { scientific_raw: "Micropterus punctulatus", common_kr: "얼룩무늬배스" },
            { scientific_raw: "Misgurnus fossilis", common_kr: "유럽미꾸리" },
            { scientific_raw: "Mylopharyngodon piceus", common_kr: "청잉어" },
            { scientific_raw: "Perccottus glenii", common_kr: "발기" },
            { scientific_raw: "Petromyzon marinus", common_kr: "대서양칠성장어" },
            { scientific_raw: "Pylodictis olivaris", common_kr: "넓적머리동자개" },
            { scientific_raw: "Silurus glanis", common_kr: "웰스메기" },
            { scientific_raw: "Ameiurus nebulosus", common_kr: "북미갈색동자개" },
            { scientific_raw: "Ameiurus melas", common_kr: "북미검정동자개" },
            { scientific_raw: "Morone americana", common_kr: "북미흰농어" },
            { scientific_raw: "Morone chrysops", common_kr: "흰배스" },
            { scientific_raw: "Scardinius erythrophthalmus", common_kr: "러드" },
            { scientific_raw: "Aspius aspius", common_kr: "아스피우스황어" },
            { scientific_raw: "Biwia zezera", common_kr: "비와매치" },
            { scientific_raw: "Gnathopogon elongatus", common_kr: "일본긴줄몰개" },
            { scientific_raw: "Ischikauia steenackeri", common_kr: "비와강준치" },
            { scientific_raw: "Ictiobus bubalus", common_kr: "검정입북미잉어" },
            { scientific_raw: "Esox niger", common_kr: "검정민물꼬치고기" },
            { scientific_raw: "Gasterosteus microcephalus", common_kr: "작은머리큰가시고기" },
            { scientific_raw: "Oncorhynchus masou rhodurus", common_kr: "비와산천어" },
            { scientific_raw: "Oncorhynchus clarkii", common_kr: "클라크송어" },
            { scientific_raw: "Catostomus catostomus", common_kr: "긴코서커" },
            { scientific_raw: "Cobitis biwae", common_kr: "비와종개" },
            { scientific_raw: "Acheilognathus asmussii", common_kr: "러시아납지리" },
            { scientific_raw: "Carassius gibelio", common_kr: "기벨리오붕어" },
            { scientific_raw: "Squalius cephalus", common_kr: "유럽몰개" },
            { scientific_raw: "Leuciscus leuciscus", common_kr: "유럽야레" },
            { scientific_raw: "Sarcocheilichthys variegatus microoculus", common_kr: "일본참중고기" },
            { scientific_raw: "Lepomis humilis", common_kr: "황점블루길" },
            { scientific_raw: "Channa panaw", common_kr: "파나우가물치" },
            { scientific_raw: "Sander volgensis", common_kr: "볼가민물꼬치농어" },
            { scientific_raw: "Liobagrus reinii", common_kr: "일본퉁가리" },
            { scientific_raw: "Lates niloticus", common_kr: "나일농어" },
            { scientific_raw: "Morone saxatilis", common_kr: "줄농어" },
            { scientific_raw: "Gymnocephalus cernua", common_kr: "러프민물농어" },
            { scientific_raw: "Leuciscus idus", common_kr: "금빛황어" },
            { scientific_raw: "Alburnus alburnus", common_kr: "블릭" },
            { scientific_raw: "Alburnus chalcoides", common_kr: "다뉴브블릭" },
            { scientific_raw: "Coregonus albula", common_kr: "벤데이스흰연어" },
            { scientific_raw: "Coregonus lavaretus", common_kr: "유럽흰연어" },
            { scientific_raw: "Coregonus maraena", common_kr: "마라이나흰연어" },
            { scientific_raw: "Coregonus peled", common_kr: "페일리드흰연어" },
            { scientific_raw: "Gambusia holbrooki", common_kr: "동부모스퀴토피쉬" },
            { scientific_raw: "Ictalurus furcatus", common_kr: "푸른채널동자개" },
            { scientific_raw: "Pterygoplichthys disjunctivus", common_kr: "벌레무늬플래코" },
            { scientific_raw: "Pterygoplichthys multiradiatus", common_kr: "오리노코플래코" },
            { scientific_raw: "Rutilus rutilus", common_kr: "로우치" },
            { scientific_raw: "Cyprinus carpio specularis", common_kr: "거울잉어" },
            { scientific_raw: "Parachondrostoma toxostoma", common_kr: "톡소스톰황어" },
            { scientific_raw: "Amphilophus citrinellus", common_kr: "미다스키클리드" },
            { scientific_raw: "Clupeonella tscharchalensis", common_kr: "유럽담수티울카" },
            { scientific_raw: "Cobitis bilineata", common_kr: "이탈리아기름종개" },
            { scientific_raw: "Knipowitschia longecaudata", common_kr: "롱테일드워프망둑" },
            { scientific_raw: "Neogobius eurycephalus", common_kr: "유럽머쉬룸망둑" },
            { scientific_raw: "Neogobius fluviatilis", common_kr: "몽키망둑" },
            { scientific_raw: "Neogobius gorlap", common_kr: "카스피큰머리망둑" },
            { scientific_raw: "Neogobius pallasi", common_kr: "카스피모래망둑" },
            { scientific_raw: "Odontesthes bonariensis", common_kr: "아르헨티나실버사이드" },
            { scientific_raw: "Siganus rivulatus", common_kr: "마블독가시치" },
            { scientific_raw: "Perca flavescens", common_kr: "북미강농어" },
            { scientific_raw: "Rhodeus amarus", common_kr: "유럽납줄개" },
            { scientific_raw: "Acheilognathus tabira", common_kr: "다비라납자루" },
            { scientific_raw: "Gnathopogon caerulescens", common_kr: "비와호줄몰개" },
            { scientific_raw: "Chondrostoma nasus", common_kr: "유럽황어" },
            { scientific_raw: "Cirrhinus mrigala", common_kr: "무리갈잉어" },
            { scientific_raw: "Clarias macrocephalus", common_kr: "납작머리열대메기" },
            { scientific_raw: "Clarias lazera", common_kr: "아프리카열대메기" },
            { scientific_raw: "Pterygoplichthys pardalis", common_kr: "아마존비파" },
            { scientific_raw: "Lepomis microlophus", common_kr: "붉은귀블루길" },
            { scientific_raw: "Morone saxatilis × Morone chrysops", common_kr: "양식줄농어" },
            { scientific_raw: "Sander vitreus", common_kr: "월아이농어" },
            { scientific_raw: "Barbus barbus", common_kr: "수염잉어" },
            { scientific_raw: "Lates calcarifer", common_kr: "바라문디농어" },
            { scientific_raw: "Piaractus mesopotamicus", common_kr: "파쿠" },
            { scientific_raw: "Catostomus commersonii", common_kr: "화이트서커" },
            { scientific_raw: "Australoheros facetus", common_kr: "카멜레온틸라피아" },
            { scientific_raw: "Babka gymnotrachelus", common_kr: "레이서망둑" },
            { scientific_raw: "Barbus plebejus", common_kr: "이탈리아누치" },
            { scientific_raw: "Channa lucius", common_kr: "점줄가물치" },
            { scientific_raw: "Channa marulius", common_kr: "큰가물치" },
            { scientific_raw: "Clarias batrachus", common_kr: "걷는클라리아스메기" },
            { scientific_raw: "Clarias fuscus", common_kr: "흰점클라리아스메기" },
            { scientific_raw: "Coptodon zillii", common_kr: "붉은배틸라피아" },
            { scientific_raw: "Culaea inconstans", common_kr: "북미계곡가시고기" },
            { scientific_raw: "Elopichthys bambusa", common_kr: "노란뺨긴황어" },
            { scientific_raw: "Enneacanthus obesus", common_kr: "줄무늬블루길" },
            { scientific_raw: "Fundulus catenatus", common_kr: "북미점박이송사리" },
            { scientific_raw: "Lepomis auritus", common_kr: "붉은가슴블루길" },
            { scientific_raw: "Leucaspius delineatus", common_kr: "선블릭유럽갈겨니" },
            { scientific_raw: "Mayaheros urophthalmus", common_kr: "멕시코시클리드" },
            { scientific_raw: "Pelmatolapia mariae (=Tilapia mariae)", common_kr: "점틸라피아" },
            { scientific_raw: "Proterorhinus semilunaris", common_kr: "서유럽관코망둑" },
            { scientific_raw: "Romanogobio belingi", common_kr: "북유럽흰마자" },
            { scientific_raw: "Salvelinus fontinalis", common_kr: "북미계곡곤들매기" },
            { scientific_raw: "Sarotherodon melanotheron", common_kr: "검은턱틸라피아" },
            { scientific_raw: "Coregonus muksun", common_kr: "묵순우레기" },
            { scientific_raw: "Lepomis gibbosus", common_kr: "펌프킨시드블루길" },
            { scientific_raw: "Channa maculata", common_kr: "얼룩가물치" },
            { scientific_raw: "Tinca tinca", common_kr: "작은비늘잉어" },
            { scientific_raw: "Culter alburnus", common_kr: "백어" },
            { scientific_raw: "Ponticola kessleri", common_kr: "큰머리망둑" },
            { scientific_raw: "Acheilognathus cyanostigma", common_kr: "일본줄납자루" },
            { scientific_raw: "Acheilognathus typus", common_kr: "일본납지리" },
            { scientific_raw: "Alosa immaculata (=Alosa pontica)", common_kr: "흑해대서양전어" },
            { scientific_raw: "Barbus meridionalis", common_kr: "지중해누치" },
            { scientific_raw: "Clupeonella cultriventris", common_kr: "흑해왜청어" },
            { scientific_raw: "Morone mississippiensis", common_kr: "미시시피민물농어" },
            { scientific_raw: "Oncorhynchus nerka", common_kr: "홍연어" },
            { scientific_raw: "Ameiurus natalis", common_kr: "황색찬넬동자개" },
            { scientific_raw: "Apeltes quadracus", common_kr: "북미사극가시고기" },
            { scientific_raw: "Hucho hucho", common_kr: "다비뉴자치" },
            { scientific_raw: "Ictalurus catus (=Ameiurus catus)", common_kr: "흰배찬넬동자개" },
            { scientific_raw: "Barbatula barbatula", common_kr: "시베리아종개" },
            { scientific_raw: "Gila atraria", common_kr: "북미황어" },
            { scientific_raw: "Heterandria bimaculata (=Pseudoxiphophorus bimaculatus)", common_kr: "두점열대송사리" },
            { scientific_raw: "Hypophthalmichthys harmandi", common_kr: "큰비늘백연어" },
            { scientific_raw: "Lepomis gulosus", common_kr: "얼룩무늬블루길" },
            { scientific_raw: "Lepomis peltastes", common_kr: "붉은점블루길" },
            { scientific_raw: "Menidia beryllina", common_kr: "북미색줄멸" },
            { scientific_raw: "Phalloceros caudimaculatus", common_kr: "흑점모기어" },
            { scientific_raw: "Serrasalmus antoni (=Pristobrycon striolatus)", common_kr: "흑점피라냐" },
            { scientific_raw: "Tanakia limbata", common_kr: "일본칼납자루" },
            { scientific_raw: "Anguilla reinhardtii", common_kr: "호주얼룩장어" },
            { scientific_raw: "Fundulus heteroclitus", common_kr: "머미초그점박이송사리" },
            { scientific_raw: "Esox masquinongy", common_kr: "빗살무늬강꼬치고기" },
            { scientific_raw: "Proterorhinus marmoratus", common_kr: "유라시아관코망둑" },
            { scientific_raw: "Salvelinus namaycush", common_kr: "북미호수곤들매기" },
            { scientific_raw: "Monopterus cuchia", common_kr: "쿠치아드렁허리" },
            { scientific_raw: "Perna viridis", common_kr: "초록담치" },
            { scientific_raw: "Achatina achatina", common_kr: "범무늬왕달팽이" },
            { scientific_raw: "Lissachatina immaculata", common_kr: "분홍입술왕달팽이" },
            { scientific_raw: "Deroceras agreste", common_kr: "초원뾰족민달팽이" },
            { scientific_raw: "Deroceras panormitanum", common_kr: "긴목뾰족민달팽이" },
            { scientific_raw: "Deroceras subagreste", common_kr: "정원뾰족민달팽이" },
            { scientific_raw: "Xeropicta krynickii", common_kr: "방사무늬사막달팽이" },
            { scientific_raw: "Helix lucorum", common_kr: "에스카르고흰줄달팽이" },
            { scientific_raw: "Helix pomatia", common_kr: "에스카르고큰달팽이" },
            { scientific_raw: "Deroceras laeve", common_kr: "부다페스트민달팽이" },
            { scientific_raw: "Tandonia rustica", common_kr: "점박이능선달팽이" },
            { scientific_raw: "Tandonia sowerbyi", common_kr: "나무껍질민달팽이" },
            { scientific_raw: "Pomacea diffusa", common_kr: "높은탑사과우렁이" },
            { scientific_raw: "Succinea costaricana", common_kr: "호박잼물우렁이" },
            { scientific_raw: "Elisolimax flavescens", common_kr: "아프리카바나나민달팽이" },
            { scientific_raw: "Arion vulgaris", common_kr: "스페인민달팽이" },
            { scientific_raw: "Deroceras invadens", common_kr: "갈색뾰족민달팽이" },
            { scientific_raw: "Euglandina rosea", common_kr: "붉은늑대달팽이" },
            { scientific_raw: "Dreissena polymorpha", common_kr: "얼룩무늬담치" },
            { scientific_raw: "Dreissena bugensis (=Dreissena rostriformis subsp. bugensis)", common_kr: "콰가담치" },
            { scientific_raw: "Potamopyrgus antipodarum", common_kr: "뉴질랜드진흙우렁이" },
            { scientific_raw: "Mytilopsis sallei", common_kr: "검은줄무늬홍합" },
            { scientific_raw: "Arion lusitanicus", common_kr: "포르투갈민달팽이" },
            { scientific_raw: "Cornu aspersum (=Helix aspersa)", common_kr: "정원달팽이" },
            { scientific_raw: "Crepidula fornicata", common_kr: "대서양짚신고둥" },
            { scientific_raw: "Pomacea scalaris", common_kr: "갈색사과우렁이" },
            { scientific_raw: "Biomphalaria straminea", common_kr: "남미또아리물달팽이" },
            { scientific_raw: "Cernuella virgata", common_kr: "포도밭달팽이" },
            { scientific_raw: "Laevicaulis alte", common_kr: "가죽민달팽이" },
            { scientific_raw: "Ambigolimax valentianus", common_kr: "세줄민달팽이" },
            { scientific_raw: "Tarebia granifera", common_kr: "남방누비달팽이" },
            { scientific_raw: "Arion distinctus", common_kr: "검은얼굴민달팽이" },
            { scientific_raw: "Perna perna", common_kr: "갈색주걱담치" },
            { scientific_raw: "Pomacea bridgesii", common_kr: "꼭지사과우렁이" },
            { scientific_raw: "Urosalpinx cinerea", common_kr: "대서양굴잡이고둥" },
            { scientific_raw: "Deroceras sturanyi", common_kr: "회색작은뾰족민달팽이" },
            { scientific_raw: "Bithynia tentaculata", common_kr: "유럽쇠우렁이" },
            { scientific_raw: "Eobania vermiculata", common_kr: "유럽띠달팽이" },
            { scientific_raw: "Arianta arbustorum", common_kr: "덤불달팽이" },
            { scientific_raw: "Belocaulus angustipes", common_kr: "검은가죽민달팽이" },
            { scientific_raw: "Cochlicella barbara", common_kr: "유럽꼭지달팽이" },
            { scientific_raw: "Procambarus virginalis", common_kr: "마블가재" },
            { scientific_raw: "Procambarus acutus", common_kr: "북미흰돌기가재" },
            { scientific_raw: "Dikerogammarus haemobaphes", common_kr: "데몬두뿔옆새우" },
            { scientific_raw: "Hemimysis anomala", common_kr: "카스피해붉은띠곤쟁이" },
            { scientific_raw: "Faxonius propinquus", common_kr: "북미맑은물가재" },
            { scientific_raw: "Pontastacus leptodactylus", common_kr: "다뉴브유럽가재" },
            { scientific_raw: "Crangonyx pseudogracilis", common_kr: "날씬서양옆새우" },
            { scientific_raw: "Faxonius juvenilis", common_kr: "켄터키가재" },
            { scientific_raw: "Paramysis lacustris", common_kr: "카스피해기수곤쟁이" },
            { scientific_raw: "Faxonius limosus (=Orconectes limosus)", common_kr: "가시투성팩슨가재" },
            { scientific_raw: "Pacifastacus leniusculus", common_kr: "붉은손바닥태평양가재" },
            { scientific_raw: "Faxonius virilis (=Orconectes virilis)", common_kr: "큰집게발팩슨가재" },
            { scientific_raw: "Carcinus maenas", common_kr: "유럽녹색꽃게" },
            { scientific_raw: "Faxonius rusticus (=Orconectes rusticus)", common_kr: "녹슨점무늬팩슨가재" },
            { scientific_raw: "Rhithropanopeus harrisii", common_kr: "해리스진흙게" },
            { scientific_raw: "Pontogammarus robustoides", common_kr: "건장폰토옆새우" },
            { scientific_raw: "Austrominius modestus (=Elminius modestus)", common_kr: "꼬마남방붉은따개비" },
            { scientific_raw: "Macrobrachium lanchesteri", common_kr: "논유리징거미새우" },
            { scientific_raw: "Osteopilus septentrionalis", common_kr: "쿠바청개구리" },
            { scientific_raw: "Pelophylax ridibundus", common_kr: "웃는개구리" },
            { scientific_raw: "Rana lessonae", common_kr: "유럽연못개구리" },
            { scientific_raw: "Bufo formosus", common_kr: "동일본두꺼비" },
            { scientific_raw: "Bufo praetextatus", common_kr: "서일본두꺼비" },
            { scientific_raw: "Fejervarya kawamurai", common_kr: "히로시마늪개구리" },
            { scientific_raw: "Fejervarya sakishimensis", common_kr: "사키시마늪개구리" },
            { scientific_raw: "Rana japonica", common_kr: "일본산개구리" },
            { scientific_raw: "Pelophylax porosus", common_kr: "다루마개구리" },
            { scientific_raw: "Epidalea calamita", common_kr: "서유럽황갈색두꺼비" },
            { scientific_raw: "Sclerophrys mauritanica", common_kr: "모리타니두꺼비" },
            { scientific_raw: "Rhinella marinus", common_kr: "사탕수수두꺼비" },
            { scientific_raw: "Pelophylax esculentus", common_kr: "유럽식용개구리" },
            { scientific_raw: "Pelophylax kurtmuelleri", common_kr: "발칸개구리" },
            { scientific_raw: "Anaxyrus cognatus", common_kr: "대평원두꺼비" },
            { scientific_raw: "Anaxyrus punctatus", common_kr: "붉은점박이두꺼비" },
            { scientific_raw: "Cryptobranchus alleganiensis", common_kr: "미국장수도롱뇽" },
            { scientific_raw: "Duttaphrynus melanostictus", common_kr: "아시아검은안경두꺼비" },
            { scientific_raw: "Rana grylio", common_kr: "돼지개구리" },
            { scientific_raw: "Rana heckscheri", common_kr: "강개구리" },
            { scientific_raw: "Rana pipiens", common_kr: "북방표범개구리" },
            { scientific_raw: "Hylarana erythraea", common_kr: "아시아녹색개구리" },
            { scientific_raw: "Hoplobatrachus tigerinus", common_kr: "인도황소개구리" },
            { scientific_raw: "Hoplobatrachus rugulosus", common_kr: "동아시아황소개구리" },
            { scientific_raw: "Litoria dentata", common_kr: "염소울음청개구리" },
            { scientific_raw: "Litoria ewingii", common_kr: "호주남부갈색청개구리" },
            { scientific_raw: "Litoria raniformis", common_kr: "호주남부종개구리" },
            { scientific_raw: "Litoria aurea", common_kr: "그린벨개구리" },
            { scientific_raw: "Fejervarya limnocharis", common_kr: "보이에사마귀개구리" },
            { scientific_raw: "Anaxyrus speciosus", common_kr: "텍사스두꺼비" },
            { scientific_raw: "Bufo typhonius", common_kr: "낙엽두꺼비" },
            { scientific_raw: "Rana dalmatina", common_kr: "유럽기민개구리" },
            { scientific_raw: "Anaxyrus quercicus (=Bufo quercicus)", common_kr: "참나무두꺼비" },
            { scientific_raw: "Bombina bombina", common_kr: "유럽무당개구리" },
            { scientific_raw: "Bombina variegata", common_kr: "노란배무당개구리" },
            { scientific_raw: "Eleutherodactylus coqui", common_kr: "코키개구리" },
            { scientific_raw: "Eleutherodactylus johnstonei", common_kr: "소앤틸리스휘슬개구리" },
            { scientific_raw: "Eleutherodactylus planirostris", common_kr: "온실개구리" },
            { scientific_raw: "Gastrophryne carolinensis", common_kr: "북미동부맹꽁이" },
            { scientific_raw: "Pseudacris regilla", common_kr: "태평양청개구리" },
            { scientific_raw: "Limnonectes kuhlii", common_kr: "쿨개울개구리" },
            { scientific_raw: "Microhyla okinavensis", common_kr: "오키나와벼맹꽁이" },
            { scientific_raw: "Polypedates leucomystax", common_kr: "아시아갈색청개구리" },
            { scientific_raw: "Scinax ruber", common_kr: "붉은코청개구리" },
            { scientific_raw: "Discoglossus pictus", common_kr: "지중해치장개구리" },
            { scientific_raw: "Hyla arborea", common_kr: "유럽청개구리" },
            { scientific_raw: "Limnodynastes dorsalis", common_kr: "서부밴조개구리" },
            { scientific_raw: "Limnodynastes dumerilii", common_kr: "동부밴조개구리" },
            { scientific_raw: "Lithobates clamitans (=Rana clamitans)", common_kr: "초록황소개구리" },
            { scientific_raw: "Lithobates septentrionalis (=Rana septentrionalis)", common_kr: "밍크황소개구리" },
            { scientific_raw: "Lithobates virgatipes (=Rana virgatipes)", common_kr: "목수황소개구리" },
            { scientific_raw: "Plethodon cinereus", common_kr: "동부붉은등미주도롱뇽" },
            { scientific_raw: "Plethodon glutinos", common_kr: "점박이미주도롱뇽" }
        ];

        // 생태계교란생물 내장 데이터
        const ecologicalDisturbanceData = [
            { common_kr: "황소개구리", scientific_raw: "Lithobates catesbeianus" },
            { common_kr: "붉은귀거북속 전종", scientific_raw: "Trachemys spp." },
            { common_kr: "리버쿠터", scientific_raw: "Pseudemys concinna" },
            { common_kr: "중국줄무늬목거북", scientific_raw: "Mauremys sinensis" },
            { common_kr: "악어거북", scientific_raw: "Macrochelys temminckii" },
            { common_kr: "플로리다붉은배거북", scientific_raw: "Pseudemys nelsoni" },
            { common_kr: "늑대거북", scientific_raw: "Chelydra serpentina" },
            { common_kr: "블루길", scientific_raw: "Lepomis macrochirus" },
            { common_kr: "배스", scientific_raw: "Micropterus salmoides" },
            { common_kr: "브라운송어", scientific_raw: "Salmo trutta" },
            { common_kr: "미국가재", scientific_raw: "Procambarus clarkii" }
        ];

        // 생태계위해우려생물 내장 데이터
        const ecologicalRiskData = [
            { common_kr: "라쿤", scientific_raw: "Procyon lotor" },
            { common_kr: "대서양연어", scientific_raw: "Salmo salar" },
            { common_kr: "피라냐", scientific_raw: "Pygocentrus nattereri" },
            { common_kr: "아프리카발톱개구리", scientific_raw: "Xenopus laevis" }
        ];

        // 회유성해양생물 내장 데이터
        const migratoryMarineData = [
            { scientific_raw: "Eriocheir sinensis" },
            { scientific_raw: "Eriocheir japonicus" },
            { scientific_raw: "Anguilla japonica" },
            { scientific_raw: "Oncorhynchus keta" }
        ];

        // 유해해양생물 내장 데이터
        const harmfulMarineData = [
            { scientific_raw: "Nemopilema nomurai", common_kr: "노무라입깃해파리" },
            { scientific_raw: "Aurelia aurita", common_kr: "보름달물해파리" },
            { scientific_raw: "Physalia physalis", common_kr: "작은관해파리" },
            { scientific_raw: "Carybdea brevipedalia", common_kr: "입상상자해파리" },
            { scientific_raw: "Chrysaora pacifica", common_kr: "커튼원반해파리" },
            { scientific_raw: "Asterina pectinifera", common_kr: "별불가사리" },
            { scientific_raw: "Asterias amurensis", common_kr: "아무르불가사리" }
        ];

    // ------------------------------------------------------------------
    // 학명 정규화 + 카테고리별 체크 함수 (original.html에서 그대로 추출)
    // ------------------------------------------------------------------

        /**
         * 학명 정규화 함수 (국외반출승인대상 비교용)
         */
        function normalizeScientificName(name) {
            if (!name) return { error: "입력값이 없습니다." };

            // 1. HTML 태그 및 괄호(그 안의 내용 포함) 제거
            let cleaned = name.replace(/<[^>]*>?/gm, '');
            cleaned = cleaned.replace(/\([^)]*\)/g, '');
            
            // 2. 쉼표, 쌍점, 세미콜론 등 문장부호 제거 (명명자/연도 구분용)
            cleaned = cleaned.replace(/[,;:]/g, '');

            // 3. 앞뒤 공백 및 연속 공백 1개로 축소
            cleaned = cleaned.trim().replace(/\s+/g, ' ');

            // 4. 불확정 표기 체크
            const lowerCleaned = cleaned.toLowerCase();
            const wordsForCheck = lowerCleaned.split(' ');
            const uncertainTerms = ['sp.', 'spp.', 'cf.', 'aff.', 'nr.', 'sp', 'spp', 'cf', 'aff', 'nr'];
            const hasUncertain = wordsForCheck.some(word => uncertainTerms.includes(word));
            
            if (hasUncertain) {
                return { error: "sp., spp. 등 불확정 표기는 판정에서 제외됩니다." };
            }

            // 5. 단어 추출 및 검증 (속명, 종소명, 아종명)
            const parts = cleaned.split(' ');
            let validParts = [];
            
            for (let i = 0; i < parts.length; i++) {
                const word = parts[i];
                
                // 속명: 첫 글자 대문자, 나머지 소문자
                if (i === 0) {
                    validParts.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
                } 
                // 종소명 및 아종명: 소문자
                else if (i === 1 || i === 2) {
                    // 첫 글자가 대문자이거나 숫자가 있으면 명명자/연도로 판단하여 무시
                    if (/^[A-Z]/.test(word) || /[0-9]/.test(word)) {
                        break;
                    }
                    validParts.push(word.toLowerCase());
                } else {
                    break; // 4번째 단어부터는 무시
                }
            }

            // 6. 형태 검증
            if (validParts.length < 2 || validParts.length > 3) {
                return { error: "형식 오류: 학명은 '속명 종소명' 또는 '속명 종소명 아종명' 형태여야 합니다." };
            }

            return { normalized: validParts.join(' ') };
        }

        /**
         * 국내 멸종위기종 여부 확인
         */
        function checkKoreanEndangeredStatus(query, krEndangeredData) {
            const normResult = normalizeScientificName(query);

            if (normResult.error) {
                return { status: 'error', message: normResult.error, source: SOURCE_KR_ENDANGERED };
            }

            const searchKey = normResult.normalized.toLowerCase();

            if (!krEndangeredData || krEndangeredData.length === 0) {
                return { status: 'error', message: '국내 멸종위기종 데이터를 불러오지 못했습니다.', source: SOURCE_KR_ENDANGERED };
            }

            const match = krEndangeredData.find(item => {
                const sciName = item['학명'] || item['학 명'] || item['SCIENTIFIC_NAME'] || item['scientificName'] || '';
                if (!sciName) return false;
                const normItem = normalizeScientificName(sciName);
                if (normItem.normalized) {
                    return normItem.normalized.toLowerCase() === searchKey;
                }
                return sciName.trim().toLowerCase() === searchKey;
            });

            if (match) {
                const grade = match['지정등급'] || match['등급'] || match['GRADE'] || match['지정 등급'] || '보호종';
                const name = match['학명'] || match['학 명'] || match['SCIENTIFIC_NAME'] || query;
                const commonName = match['국명'] || match['한글명'] || match['명칭'] || '';
                return { status: 'found', grade: grade, name: name, commonName: commonName, source: SOURCE_KR_ENDANGERED };
            } else {
                return { status: 'not_found', source: SOURCE_KR_ENDANGERED };
            }
        }

        /**
         * 국외반출승인대상 여부 확인
         */
        function checkExportApprovalStatus(query) {
            const normResult = normalizeScientificName(query);

            if (normResult.error) {
                return { status: 'error', message: normResult.error, source: SOURCE_STATIC };
            }

            const searchKey = normResult.normalized;
            const matches = exportApprovalData.filter(item => item.normalizedKey === searchKey);

            if (matches.length > 0) {
                return { status: 'found', matches: matches, source: SOURCE_STATIC };
            } else {
                return { status: 'not_found', source: SOURCE_STATIC };
            }
        }

        /**
         * 유입주의생물 여부 확인
         */
        function checkInvasiveAlienStatus(query) {
            const normResult = normalizeScientificName(query);

            if (normResult.error) {
                return { status: 'error', message: normResult.error, source: SOURCE_STATIC };
            }

            const searchKey = normResult.normalized;
            const matches = invasiveAlienSpeciesData.filter(item => item.normalizedKey === searchKey);

            if (matches.length > 0) {
                return { status: 'found', matches: matches, source: SOURCE_STATIC };
            } else {
                return { status: 'not_found', source: SOURCE_STATIC };
            }
        }

        /**
         * 생태계교란생물 여부 확인
         */
        function checkEcologicalDisturbanceStatus(query) {
            const normResult = normalizeScientificName(query);

            if (normResult.error) {
                return { status: 'error', message: normResult.error, source: SOURCE_STATIC };
            }

            const searchKey = normResult.normalized;
            const matches = ecologicalDisturbanceData.filter(item => item.normalizedKey === searchKey);

            if (matches.length > 0) {
                return { status: 'found', matches: matches, source: SOURCE_STATIC };
            } else {
                return { status: 'not_found', source: SOURCE_STATIC };
            }
        }

        /**
         * 생태계위해우려생물 여부 확인
         */
        function checkEcologicalRiskStatus(query) {
            const normResult = normalizeScientificName(query);

            if (normResult.error) {
                return { status: 'error', message: normResult.error, source: SOURCE_STATIC };
            }

            const searchKey = normResult.normalized;
            const matches = ecologicalRiskData.filter(item => item.normalizedKey === searchKey);

            if (matches.length > 0) {
                return { status: 'found', matches: matches, source: SOURCE_STATIC };
            } else {
                return { status: 'not_found', source: SOURCE_STATIC };
            }
        }

        /**
         * 해양보호생물 여부 확인
         */
        function checkMarineProtectedStatus(query) {
            const normResult = normalizeScientificName(query);

            if (normResult.error) {
                return { status: 'error', message: normResult.error, source: SOURCE_STATIC };
            }

            const searchKey = normResult.normalized;
            const matches = marineProtectedData.filter(item => item.normalizedKey === searchKey);

            if (matches.length > 0) {
                return { status: 'found', matches: matches, source: SOURCE_STATIC };
            } else {
                return { status: 'not_found', source: SOURCE_STATIC };
            }
        }

        /**
         * 회유성해양생물 여부 확인
         */
        function checkMigratoryMarineStatus(query) {
            const normResult = normalizeScientificName(query);

            if (normResult.error) {
                return { status: 'error', message: normResult.error, source: SOURCE_STATIC };
            }

            const searchKey = normResult.normalized;
            const matches = migratoryMarineData.filter(item => item.normalizedKey === searchKey);

            if (matches.length > 0) {
                return { status: 'found', matches: matches, source: SOURCE_STATIC };
            } else {
                return { status: 'not_found', source: SOURCE_STATIC };
            }
        }

        /**
         * 유해해양생물 여부 확인
         */
        function checkHarmfulMarineStatus(query) {
            const normResult = normalizeScientificName(query);

            if (normResult.error) {
                return { status: 'error', message: normResult.error, source: SOURCE_STATIC };
            }

            const searchKey = normResult.normalized;
            const matches = harmfulMarineData.filter(item => item.normalizedKey === searchKey);

            if (matches.length > 0) {
                return { status: 'found', matches: matches, source: SOURCE_STATIC };
            } else {
                return { status: 'not_found', source: SOURCE_STATIC };
            }
        }


    // ------------------------------------------------------------------
    // CITES 체크 (기존 original.html 인라인 fetch 로직을 함수로 분리 +
    // 다른 checkXStatus 함수들과 동일한 {status, ...} 셰이프로 정규화)
    // ------------------------------------------------------------------
    async function checkCitesStatus(query, apiToken) {
        try {
            const response = await fetch(`https://api.speciesplus.net/api/v1/taxon_concepts?name=${encodeURIComponent(query)}`, {
                headers: { 'X-Authentication-Token': apiToken }
            });

            if (!response.ok) {
                return { status: 'error', message: `CITES API 요청에 실패했습니다. (상태 코드: ${response.status})`, source: SOURCE_CITES };
            }

            const data = await response.json();

            if (data && data.taxon_concepts && data.taxon_concepts.length > 0) {
                const item = data.taxon_concepts[0];
                const rawListing = item.cites_listing || (item.cites_listings && item.cites_listings.join(', ')) || '';
                // Species+는 "cites_listing"에 명시적으로 'NC'(Not currently listed) 값을 채워
                // "부속서 미등재"를 나타낸다(예: Felis catus는 Felidae 속 전체가 부속서 II이지만
                // 국내 사육 고양이는 별도 주석으로 제외되어 NC로 표기됨). 'NC'는 빈 리스팅과
                // 동일하게 not_found로 취급해야 한다 — 그대로 두면 "CITES NC 등급"처럼 실제로는
                // 규제 대상이 아닌 종을 규제 대상인 것처럼 답변하는 새로운 환각을 만들게 된다.
                const listing = rawListing === 'NC' ? '' : rawListing;

                // 종이 Species+ DB에는 있지만 CITES 부속서 리스팅이 없는 경우(예: 임금펭귄)도
                // "미등재 종(not_found)"와 동일하게 취급 — 두 경우를 다르게 다루면 LLM이
                // "정보 없음"과 "해당 없음"을 혼동해 다시 얼버무릴 위험이 있음.
                if (!listing) {
                    return { status: 'not_found', name: item.full_name || query, source: SOURCE_CITES };
                }

                return { status: 'found', listing: listing, name: item.full_name || query, source: SOURCE_CITES };
            }

            return { status: 'not_found', source: SOURCE_CITES };
        } catch (error) {
            return { status: 'error', message: error.message || 'CITES API 요청에 실패했습니다.', source: SOURCE_CITES };
        }
    }

    // ------------------------------------------------------------------
    // 정적 데이터셋의 normalizedKey를 모듈 로드 시 1회 미리 계산
    // (원래 original.html의 DOMContentLoaded 핸들러에서 하던 일을 모듈 자체가 수행)
    // ------------------------------------------------------------------
    function initNormalizedKeys(dataset) {
        dataset.forEach(function (item) {
            const norm = normalizeScientificName(item.scientific_raw);
            item.normalizedKey = norm.error ? null : norm.normalized;
        });
    }

    [
        marineProtectedData,
        exportApprovalData,
        invasiveAlienSpeciesData,
        ecologicalDisturbanceData,
        ecologicalRiskData,
        migratoryMarineData,
        harmfulMarineData
    ].forEach(initNormalizedKeys);

    // ------------------------------------------------------------------
    // 통합 조회 애그리게이터 — 9개 카테고리를 한 번에 조회해 통합 JSON 반환
    // (server.js의 tool handler와 agent.html/original.html이 공통으로 사용)
    // ------------------------------------------------------------------
    async function lookupAllCategories(query, options) {
        options = options || {};
        const krEndangeredData = options.krEndangeredData;
        const citesApiToken = options.citesApiToken;

        const cites = await checkCitesStatus(query, citesApiToken);

        return {
            scientific_name_query: query,
            cites: cites,
            kr_endangered: checkKoreanEndangeredStatus(query, krEndangeredData),
            export_approval: checkExportApprovalStatus(query),
            invasive_alien: checkInvasiveAlienStatus(query),
            ecological_disturbance: checkEcologicalDisturbanceStatus(query),
            ecological_risk: checkEcologicalRiskStatus(query),
            marine_protected: checkMarineProtectedStatus(query),
            migratory_marine: checkMigratoryMarineStatus(query),
            harmful_marine: checkHarmfulMarineStatus(query)
        };
    }

    return {
        normalizeScientificName: normalizeScientificName,
        checkCitesStatus: checkCitesStatus,
        checkKoreanEndangeredStatus: checkKoreanEndangeredStatus,
        checkExportApprovalStatus: checkExportApprovalStatus,
        checkInvasiveAlienStatus: checkInvasiveAlienStatus,
        checkEcologicalDisturbanceStatus: checkEcologicalDisturbanceStatus,
        checkEcologicalRiskStatus: checkEcologicalRiskStatus,
        checkMarineProtectedStatus: checkMarineProtectedStatus,
        checkMigratoryMarineStatus: checkMigratoryMarineStatus,
        checkHarmfulMarineStatus: checkHarmfulMarineStatus,
        lookupAllCategories: lookupAllCategories,
        marineProtectedData: marineProtectedData,
        exportApprovalData: exportApprovalData,
        invasiveAlienSpeciesData: invasiveAlienSpeciesData,
        ecologicalDisturbanceData: ecologicalDisturbanceData,
        ecologicalRiskData: ecologicalRiskData,
        migratoryMarineData: migratoryMarineData,
        harmfulMarineData: harmfulMarineData
    };
});
