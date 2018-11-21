/**
 * index.js
 * @author 20163179 홍승환
 * @description T Map을 이용하여 교통정보를 반영한 경로를 찾고 시각화함
 */

// T Map의 인스턴스
var map;

// 지도에 경로를 그릴 레이어
var vectorLayer;

// 현재 탐색한 경로의 시작과 끝 장소 이름
var start;
var end;

// 탐색 횟수 Counter
var count = 0;

// jQuery 기반 DOM Handler
var $start = $("#form-start");
var $end = $("#form-end");
var $navbar = $(".navbar");
var $information = $("#information");
var $trigger = $("#trigger");

/**
 * 출발지, 도착지의 좌표 Database
 * @desc T Map의 API에서 좌표를 검색하여 불러오는 기능을 제공하고 있습니다만, 구현 편의를 위하여 우선 이들로 제한합니다.
 */
var DATABASE = {
  "국민대학교": {
    x: "126.9953410",	y: "37.6121866"
  },
  "서울시청": {
    x: "126.9783881", y: "37.5666102"
  },
  "인천국제공항 제2여객터미널": {
    x: "126.4250057",	y: "37.4784017"
  },
  "대전시청": {
    x: "127.3849508", y: "36.3504395"
  },
  "부산시청": {
    x: "129.0750222", y: "35.1798159"
  },
  "주문진항": {
    x: "128.8227625", y: "37.8967820"
  }
};

/**
 * 지도 초기화
 */
function initiateMap() {
  // 지도가 들어갈 div, 넓이, 높이를 설정합니다.
  map = new Tmap.Map({
    div: 'map',
    width: '100%',
    height: '100vh'
  });
  
  // 기본값으로 서울 중심부 위치를 Zoom Level 15로 가리킵니다.
  map
    .setCenter(new Tmap.LonLat("126.9850380932383", "37.566567545861645")
    .transform("EPSG:4326", "EPSG:3857"), 15);
}

/**
 * 경로 찾기
 */
function searchRoute() {
  // T Map의 데이터 처리 클래스의 인스턴스를 불러옵니다.
  var tData = new Tmap.TData();

  // 현재 선택된 장소들의 이름을 불러옵니다.
  start = $start.val();
  end = $end.val();

  // 출발 지점과 도착 지점이 같을 경우 진행하지 않습니다.
  if (start == end) {
    alert("출발 지점과 도착 지점이 같습니다.");
    return;
  }

  // 사용자 UI 시각화 처리를 수행합니다.
  $navbar.addClass("bg-success").removeClass("bg-light");
  $information.html("⟳ 경로를 탐색 중입니다...");
  $trigger.html("탐색 진행 중");
  $trigger.prop('disabled', true);

  // 해당 장소들의 좌표를 구합니다.
  var coordStart = DATABASE[start];
  var coordEnd = DATABASE[end];
  
  // 각 좌표를 담은 Tmap.LonLat 객체를 만듭니다.
  var startLonLat = new Tmap.LonLat(coordStart.x, coordStart.y);
  var endLonLat = new Tmap.LonLat(coordEnd.x, coordEnd.y);
  
  // 요청 옵션을 만듭니다.
  var optionObj = {
    reqCoordType: "WGS84GEO", // 요청 좌표계
    resCoordType: "EPSG3857", // 응답 좌표계
    trafficInfo: "Y"          // 교통 정보 기반 여부
  }
  
  // 요청: 경로 탐색 데이터를 Callback을 통해 XML로 불러옵니다.
  tData.getRoutePlan(startLonLat, endLonLat, optionObj);
  
  // 각 Callback 함수를 등록합니다.
  tData.events.register("onComplete", tData, onComplete); // 데이터를 불러왔을 때
  tData.events.register("onError", tData, onError);       // 데이터를 불러오지 못했을 때
}

/**
 * 경로 데이터를 불러왔을 때 호출되는 함수
 */
function onComplete() {		  
  // 사용자 UI 시각화 처리를 수행합니다.
  $navbar.addClass("bg-primary").removeClass("bg-success");
  $information.html("✓ 탐색이 완료되었습니다");
  $trigger.html("경로 탐색");
  $trigger.prop('disabled', false);
  setTimeout(function () {
    $navbar.addClass("bg-light").removeClass("bg-primary");
    $information.html(start + " → " + end);
  }, 2000);

  // 교통정보의 시각화 옵션을 설정합니다.    
  var trafficColors = {
    extractStyles: true,
    trafficDefaultColor: "#000000", // 교통 정보가 없을 때 경로 색
    trafficType1Color: "#009900",   // 원활한 부분의 경로 색
    trafficType2Color: "#8E8111",   // 지체 부분의 경로 색
    trafficType3Color: "#FF0000",   // 정체 부분의 경로 색
  };    

  // 불러온 XML에서 교통정보를 읽어들입니다. KML Parser는 T Map API에서 제공하고 있습니다.
  var kmlForm = new Tmap.Format.KML(trafficColors).readTraffic(this.responseXML);

  // 경로를 그릴 Vector Layer를 선언합니다. 이전 경로 데이터는 지워줍니다.
  if (count >= 1) {
    vectorLayer.removeAllFeatures();
  }
  vectorLayer = new Tmap.Layer.Vector("VectorLayerID" + (count++));

  // 위에서 가져온 KML 정보를 Feature에 넣습니다.
  vectorLayer.addFeatures(kmlForm);    
  
  // 위에서 만든 경로 레이어를 지도에 더하고 전체 경로가 잘 보이도록 Zoom과 Center를 조절합니다.
  map.addLayer(vectorLayer);
  map.zoomToExtent(vectorLayer.getDataExtent());
}

/**
 * 오류가 발생했을 때 호출되는 함수
 */
function onError(){
  $navbar.addClass("bg-danger").removeClass("bg-success");
  $information.html("× 오류가 발생하였습니다. 페이지를 새로고침해주세요.");
  $trigger.html("경로 탐색 불가");
  $trigger.addClass("btn-danger").removeClass("btn-dark");
  $trigger.prop('disabled', true);
}

/**
 * 페이지가 정상적으로 로딩되었을 때 호출되는 함수
 */
$(document).ready(function () {
  // T Map을 생성합니다.
  initiateMap();
});