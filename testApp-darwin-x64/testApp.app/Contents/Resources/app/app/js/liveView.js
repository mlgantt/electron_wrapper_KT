
// var sensorIDs = ['da3d30d8cafd4dbab2e5c8a34a650119', 'c6f34d2f1e964704aa58166c6e9b1b83', '883dbef5f8f54c32b880e6bd78d5deed']
var sensorIDs = ['1d16d6208155425fa41772774f491e94', '075fbeeaa732466f9151c8f67c89d23a', '883dbef5f8f54c32b880e6bd78d5deed']

var liveView = {
    DOM       : "containerLive",
    width     : window.innerWidth/2,
    container : null,
    camera    : null,
    controls  : null,
    scene     : null,
    renderer  : null,
    model     : null
}


var playbackView = {
    DOM       : "containerPlay",
    width     : window.innerWidth/2,
    container : null,
    camera    : null,
    controls  : null,
    scene     : null,
    renderer  : null,
    model     : null
}

var loadedFile = [];
var recordedFile = [];

var calibSensors = false;

var playing = false;
var recording = false;
var playCount = 0;

var quat1 = [0,0,0,0];
var quat2 = [0,0,0,0];
var quat3 = [0,0,0,0];

var ghost_quat1 = [0,0,0,0];
var ghost_quat2 = [0,0,0,0];
var ghost_quat3 = [0,0,0,0];

var zeroQuat1 = new THREE.Quaternion();
var zeroQuat2 = new THREE.Quaternion();
var zeroQuat3 = new THREE.Quaternion();

init(liveView);
init(playbackView);
initGUI();

function init(viewObj) {

    viewObj.container = document.getElementById( viewObj.DOM );

    viewObj.scene = new THREE.Scene();


    viewObj.renderer = new THREE.WebGLRenderer( { antialias: true } );
    viewObj.renderer.setPixelRatio( window.devicePixelRatio );
    viewObj.renderer.setSize( viewObj.width, window.innerHeight-200 );
    viewObj.renderer.gammaInput = true;
    viewObj.renderer.gammaOutput = true;

    viewObj.camera = new THREE.PerspectiveCamera( 60, viewObj.width / (window.innerHeight-200), 1, 20000 );
    viewObj.camera.position.x = 00; viewObj.camera.position.y = 0; viewObj.camera.position.z = 150;

    viewObj.controls = new THREE.OrbitControls( viewObj.camera, viewObj.container );
    viewObj.controls.minDistance = 50;
    viewObj.controls.maxDistance = 500;
    viewObj.controls.maxPolarAngle = 0.9 * Math.PI / 2;

    // LIGHTS

    var light = new THREE.DirectionalLight( 0xaabbff, 0.3 );
    light.position.x = 300;
    light.position.y = 250;
    light.position.z = -500;
    viewObj.scene.add( light );

    // SKYDOME

    var vertexShader = document.getElementById( 'vertexShader' ).textContent;
    var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
    var uniforms = {
        topColor:    { type: "c", value: new THREE.Color( 0x0077ff ) },
        bottomColor: { type: "c", value: new THREE.Color( 0xffffff ) },
        offset:      { type: "f", value: 400 },
        exponent:    { type: "f", value: 0.6 }
    };
    uniforms.topColor.value.copy( light.color );

    var skyGeo = new THREE.SphereGeometry( 4000, 32, 15 );
    var skyMat = new THREE.ShaderMaterial( {
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide
    } );

    var sky = new THREE.Mesh( skyGeo, skyMat );
    viewObj.scene.add( sky );

    

    viewObj.container.appendChild( viewObj.renderer.domElement );


    createModel(viewObj);
    createBody(viewObj);
    
    animate();
}

function createModel(viewObj) {

    var scene = viewObj.scene;
    
    ///////// INITIAL SETUP CODE ///////////    
    var geo = new THREE.BoxGeometry(5,5,20);
    geo.applyMatrix( new THREE.Matrix4().makeRotationY( Math.PI/2 ) );
    geo.applyMatrix( new THREE.Matrix4().makeTranslation(-13,0,0) );
    
    var hand = new THREE.BoxGeometry(3,8,7);
    hand.applyMatrix(new THREE.Matrix4().makeRotationX( Math.PI));
    hand.applyMatrix(new THREE.Matrix4().makeRotationZ( 0 ));
    hand.applyMatrix( new THREE.Matrix4().makeRotationY( Math.PI/2) );
    hand.applyMatrix( new THREE.Matrix4().makeTranslation(-7,0,0) );
    
    var _mesh1 = new THREE.Mesh(geo, new THREE.MeshNormalMaterial());
    _mesh1.position.set(-12,18,0);
    scene.add(_mesh1);

    var _mesh2 = new THREE.Mesh(geo, new THREE.MeshNormalMaterial());
    _mesh2.position.set(-26,0,0);

    var _mesh3 = new THREE.Mesh(hand, new THREE.MeshNormalMaterial());
    _mesh3.position.set(-26,0,0);

    _mesh1.add(_mesh2);
    _mesh2.add(_mesh3);

    // put sphere at mesh origin
    var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(3,20,20),
        new THREE.MeshNormalMaterial()
    );
    var sphere2 = new THREE.Mesh(
        new THREE.SphereGeometry(3,20,20),
        new THREE.MeshNormalMaterial()
    );
    var sphere3 = new THREE.Mesh(
        new THREE.SphereGeometry(3,20,20),
        new THREE.MeshNormalMaterial()
    );
    //sphere.position.set(_mesh1.position.x,_mesh1.position.y,_mesh1.position.z);
    _mesh1.add(sphere);
    _mesh2.add(sphere2);
    _mesh3.add(sphere3);

    var model = {
        shoulder :_mesh1,
        forearm  :_mesh2,
        hand     :_mesh3
    }

    viewObj.model = model;
}

function createBody(viewObj) {
    // texture

    var manager = new THREE.LoadingManager();
    manager.onProgress = function ( item, loaded, total ) {

        console.log( item, loaded, total );

    };

    var texture = new THREE.Texture();

    var onProgress = function ( xhr ) {
        if ( xhr.lengthComputable ) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round(percentComplete, 2) + '% downloaded' );
        }
    };

    var onError = function ( xhr ) {
    };


    var loader = new THREE.ImageLoader( manager );
    loader.load( 'js/model/red.png', function ( image ) {

        texture.image = image;
        texture.needsUpdate = true;

    } );

    // model

    var loader = new THREE.OBJLoader( manager );
    loader.load( 'js/model/wooden_body.obj', function ( object ) {

        object.traverse( function ( child ) {

            if ( child instanceof THREE.Mesh ) {

                child.material.map = texture;

            }

        } );

        object.position.y = -50;
        object.scale.set(10,10,10);
        viewObj.scene.add( object );

    }, onProgress, onError );

    //

}

function animate() {
    requestAnimationFrame( animate );
    
    if(liveView.renderer){
        render(true,liveView);
    }
    if(playbackView.renderer){
        render(true,playbackView);
    }
}


function processQuat(rot) {
    var x, y, z, w;
    var id = rot[0];
    w = parseFloat(rot[1]);
    x = parseFloat(rot[2]);
    y = parseFloat(rot[3]);
    z = parseFloat(rot[4]);

    if(id == sensorIDs[0]) {
        quat1 = [w,x,y,z];
    }

    if(id == sensorIDs[1]) {
        quat2 = [w,x,y,z];
    }

    if(id == sensorIDs[2]) {
        quat3 = [w,x,y,z];
    }

    if(recording){
        var newString = rot[0]+ ' : '+rot[1]+'|'+rot[2]+'|'+rot[3]+'|'+rot[4]+'\n';
        recordedFile.push(newString);
    };
}
function ZeroSensors() {
    calibSensors = true;

}

function processPlay(rot) {
       
    var x, y, z, w;
    var id = rot.split(' : ')[0].toString();
    var vals = rot.split(' : ')[1];
    var val = vals.split('|');
    w = parseFloat(val[0]);
    x = parseFloat(val[1]);
    y = parseFloat(val[2]);
    z = parseFloat(val[3]);
    

    if(id == sensorIDs[0]) {
        ghost_quat1 = [w,x,y,z];
    }

    if(id == sensorIDs[1]) {
        ghost_quat2 = [w,x,y,z];
    }

    if(id == sensorIDs[2]) {
        ghost_quat3 = [w,x,y,z];
    }

}



var _tick = 0;
function render(rotateBool, viewObj) {

    viewObj.controls.update();
    viewObj.renderer.render( viewObj.scene, viewObj.camera );
    
    if (rotateBool) {
        var quaternion1 = new THREE.Quaternion();
        var quaternion2 = new THREE.Quaternion();
        var quaternion3 = new THREE.Quaternion();

        quaternion1.set(quat1[2],quat1[3],quat1[1],quat1[0])
        quaternion2.set(quat2[2],quat2[3],quat2[1],quat2[0])
        quaternion3.set(quat3[2],quat3[3],quat3[1],quat3[0])

        ///////// RENDER CODE ///////////

        liveView.model.shoulder.setRotationFromQuaternion(quaternion1);
        liveView.model.forearm.setRotationFromQuaternion(quaternion2);
        liveView.model.hand.setRotationFromQuaternion(quaternion3);//pitch;

        // if (calibSensors == true){
        //     console.log(calibSensors)
        //     var phi1 = Math.atan2(2*(quat1[0]*quat1[1] + quat1[2]*quat1[3]), 1 - 2*(quat1[1]*quat1[1]) + (quat1[2]*quat1[2]));
        //     var theta1 = Math.asin(2*(quat1[0]*quat1[2] - quat1[3]*quat1[1]));
        //     var psi1 =  Math.atan2(2*(quat1[0]*quat1[3] + quat1[1]*quat1[3]), 1 - 2*(quat1[2]*quat1[2]) + (quat1[3]*quat1[3]));

        //     var phi2 = Math.atan2(2*(quat2[0]*quat2[1] + quat2[2]*quat2[3]), 1 - 2*(quat2[1]*quat2[1]) + (quat2[2]*quat2[2]));
        //     var theta2 = Math.asin(2*(quat2[0]*quat2[2] - quat2[3]*quat2[1]));
        //     var psi2 =  Math.atan2(2*(quat2[0]*quat2[3] + quat2[1]*quat2[3]), 1 - 2*(quat2[2]*quat2[2]) + (quat2[3]*quat2[3]));

        //     var phi3 = Math.atan2(2*(quat3[0]*quat3[1] + quat3[2]*quat3[3]), 1 - 2*(quat3[1]*quat3[1]) + (quat3[2]*quat3[2]));
        //     var theta3 = Math.asin(2*(quat3[0]*quat3[2] - quat3[3]*quat3[1]));
        //     var psi3 =  Math.atan2(2*(quat3[0]*quat3[3] + quat3[1]*quat3[3]), 1 - 2*(quat3[2]*quat3[2]) + (quat3[3]*quat3[3]));

        //     liveView.model.shoulder.applyMatrix(new THREE.Matrix4().makeRotationX(-theta1));
        //     liveView.model.shoulder.applyMatrix(new THREE.Matrix4().makeRotationY(-phi1));
        //     liveView.model.shoulder.applyMatrix(new THREE.Matrix4().makeRotationY(-psi1));

        //     liveView.model.shoulder.rotation.x = theta1;
        //     liveView.model.shoulder.rotation.y = phi1;
        //     liveView.model.shoulder.rotation.z = psi1;

        //     liveView.model.forearm.rotation.x = theta2;
        //     liveView.model.forearm.rotation.y = phi2;
        //     liveView.model.forearm.rotation.z = psi2;
        //     calibSensors = false;
        // }

        
        ///////// END OF RENDER CODE ///////////
    }
    
    if(loadedFile.length){
        processPlay(loadedFile[playCount]);
        var ghost_quaternion1 = new THREE.Quaternion();
        var ghost_quaternion2 = new THREE.Quaternion();
        var ghost_quaternion3 = new THREE.Quaternion();

        ghost_quaternion1.set(ghost_quat1[2],ghost_quat1[3],ghost_quat1[1],ghost_quat1[0])
        ghost_quaternion2.multiply(ghost_quaternion1);
        ghost_quaternion2.set(ghost_quat2[2],ghost_quat2[3],ghost_quat2[1],ghost_quat2[0])
        ghost_quaternion3.multiply(ghost_quaternion2);
        ghost_quaternion3.set(ghost_quat3[2],ghost_quat3[3],ghost_quat3[1],ghost_quat3[0])

        playbackView.model.shoulder.setRotationFromQuaternion(ghost_quaternion1);
        playbackView.model.forearm.setRotationFromQuaternion(ghost_quaternion2);
        playbackView.model.hand.setRotationFromQuaternion(ghost_quaternion3);   
        if(playing){
            if(playCount < loadedFile.length-2){
                playCount++;
                $( "#slider-range-min" ).slider({value: playCount});
            } else {
                playCount = 0;
                playing = false;
                ghost_quat1 = [0,0,0,0];
                ghost_quat2 = [0,0,0,0];
                ghost_quat3 = [0,0,0,0];
            }
        }
    }
    _tick++;
}

function readSingleFile(evt) {
    //Retrieve the first (and only!) File from the FileList object
    var f = evt.target.files[0];

    if (f) {
        var r = new FileReader();
        r.onload = function (e) {
            var contents = e.target.result;
            loadedFile = contents.split('\n');
            playbackMode();
        }
        r.readAsText(f);
    } else {
        alert("Failed to load file");
    }
    $('#modal').dialog( "close" );

}

function playbackMode (){
    $( "#slider-range-min" ).slider({
      range: "min",
      value: 0,
      min: 1,
      max: loadedFile.length - 1,
      slide: function( event, ui ) {
          playing = false;
          playCount = ui.value;
      }
    });
    $('.play_controls').show();
}


function initGUI() {
    document.getElementById('fileinput').addEventListener('change', readSingleFile, false);

    $( "#modal" ).dialog({
      autoOpen: false,
      modal: true,
      show: {
        effect: "fade",
        duration: 300
      },
      hide: {
        effect: "fade",
        duration: 300
      }
    });


    $('#loadBtn').button({
      icons: {
        primary: "ui-icon-folder-open"
      }
    }).click(function(event) {
        event.preventDefault();
        $('#modal').dialog( "open" );
    });


    $('#playBtn').button({
      icons: {
        primary: "ui-icon-play"
      },
      text: false
    }).click(function(event) {
        event.preventDefault();

        if(playing){
            playing = false;
            $("#playBtn .ui-icon").removeClass("ui-icon-pause").addClass("ui-icon-play");
        } else {
            playing = true;
            $("#playBtn .ui-icon").removeClass("ui-icon-play").addClass("ui-icon-pause");
        }
    });


    $('#resetBtn').button({
      icons: {
        primary: "ui-icon-seek-prev"
      },
      text: false
    }).click(function(event) {
        event.preventDefault();
        playing = false;
        playCount = 0;
        ghost_quat1 = [0,0,0,0];
        ghost_quat2 = [0,0,0,0];
        ghost_quat3 = [0,0,0,0];
        $( "#slider-range-min" ).slider({value: playCount});
        $("#playBtn .ui-icon").removeClass("ui-icon-pause").addClass("ui-icon-play");
        
    });

    $('#recordBtn').button({
      icons: {
        primary: "ui-icon-video"
      }
    }).click(function(event) {
        event.preventDefault();

        if(recording){
            recording = false;
            $("#recordBtn .ui-button-text").text('Record');
            $("#recordBtn .ui-icon").removeClass("ui-icon-stop").addClass("ui-icon-video");
            $("#save-confirm").dialog("open");
            clearTimeout(t);
            $('.recordTime').text("00:00:00");
            seconds = 0; minutes = 0; hours = 0;
        } else {
            recording = true;
            $("#recordBtn .ui-button-text").text('Stop');
            $("#recordBtn .ui-icon").removeClass("ui-icon-video").addClass("ui-icon-stop");
            timer();
        }
        
    });


    var seconds = 0, minutes = 0, hours = 0, t;
    function timer() {
        t = setTimeout(function(){
            seconds++;
            if (seconds >= 60) {
                seconds = 0;
                minutes++;
                if (minutes >= 60) {
                    minutes = 0;
                    hours++;
                }
            }

            $('.recordTime').text((hours ? (hours > 9 ? hours : "0" + hours) : "00") + ":" + (minutes ? (minutes > 9 ? minutes : "0" + minutes) : "00") + ":" + (seconds > 9 ? seconds : "0" + seconds));

            timer();
        }, 1000);
    }

    $("#save-confirm").dialog({
      resizable: false,
      autoOpen: false,
      dialogClass: "no-close",
      modal: true,
      buttons: {
        "Save": function() {
            $( this ).dialog( "close" );
            var blob = new Blob(recordedFile, {type: "text/plain;charset=utf-8"});

            var now = new Date().toJSON().slice(0,19);
            saveAs(blob, "KT_"+now+".txt");
            recordedFile = [];
        },
        Cancel: function() {
          $( this ).dialog( "close" );
          recordedFile = [];
        }
      }
    });

    $(window).keypress(function (e) {
      if (e.keyCode === 0 || e.keyCode === 32) {
        e.preventDefault()
        ZeroSensors();
      }
    })
}
