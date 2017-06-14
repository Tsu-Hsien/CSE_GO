var scene, camera, renderer, mesh, clock,orbitcontrols;
var Level=0;
var gameTime=110;
var skyBox;
var meshFloor, ambientLight, light;
var weaponNumber=0;
var Uzi={
	canShootTime:20,
	size:0.05,
	bulletLiveTime:1000
}
var Rocket={
	canShootTime:100,
	size:3,
	bulletLiveTime:700
}
var crate, crateTexture, crateNormalMap, crateBumpMap;
var gui;
var heightGUI,speedGUI,turnSpeedGUI,canShootGUI,skyGUI;
var keyboard = {};
var player = { live:0,kill:0,weapon:"Uzi",height:1.8, speed:0.5, turnSpeed:Math.PI*0.08, canShoot:0 ,music:false,moveAble:1,sky:"morning"};
var USE_WIREFRAME = false;
var soundTrack;
var rocketSound;
var uziSound,screamSound;
var loadingScreen = {
	scene: new THREE.Scene(),
	camera: new THREE.PerspectiveCamera(90, 1280/720, 0.1, 100)
};
var loadingManager = null;
var RESOURCES_LOADED = false;

// Models index
var models = {
	tent: {
		obj:"models/Tent_Poles_01.obj",
		mtl:"models/Tent_Poles_01.mtl",
		mesh: null
	},
	campfire: {
		obj:"models/Campfire_01.obj",
		mtl:"models/Campfire_01.mtl",
		mesh: null
	},
	pirateship: {
		obj:"models/Pirateship.obj",
		mtl:"models/Pirateship.mtl",
		mesh: null
	},
	rocket: {
		obj:"Weapons/rocketlauncher.obj",
		mtl:"Weapons/rocketlauncher.mtl",
		mesh: null,
		castShadow:false
	},
	uzi: {
		obj:"models/uziGold.obj",
		mtl:"models/uziGold.mtl",
		mesh: null,
		castShadow:false
	},
	tree:{
		obj:"models/Tree_01.obj",
		mtl:"models/Tree_01.mtl",
		mesh: null,
		castShadow:false
	},
	tree2:{
		obj:"models/Tree_02.obj",
		mtl:"models/Tree_02.mtl",
		mesh: null,
		castShadow:false
	},
	pokeball:{
		obj:"models/pokeball.obj",
		mtl:"models/pokeball.mtl",
		mesh:null,
		castShadow:false
	}
};

// Meshes index
var meshes = {};
var treeBox=[];
var weaponBox=[];
// Bullets array
var bullets = [];
var bulletsBox=[];
var ghosts=[];
var ghostsBox=[];
var mixers=[];
var ghost = function(mesh) {
  this.pos = new THREE.Vector3();
  this.pos.set (200*Math.random()-100+camera.position.x, 0, 200*Math.random()-100+camera.position.z);
  this.vel = new THREE.Vector3();
  this.force = new THREE.Vector3();
  this.target = new THREE.Vector3();
  this.angle = 0;
  
  this.mesh = mesh.clone();
  this.mesh.scale.set(0.005,0.005,0.005);
  this.mesh.scale.set( 0.01, 0.01, 0.01 );
  this.mesh.position.set(this.pos.x, 0, this.pos.z);
  scene.add (this.mesh);
  ghostsBox.push(new THREE.BoundingBoxHelper(this.mesh, 0x00ff00));
  ghostsBox.visibility=true;
  ghostsBox[ghostsBox.length-1].update();
  this.maxSpeed = 5+Level/2;
  this.maxForce = 15;
	this.mixer = new THREE.AnimationMixer( this.mesh );
	this.mixer.clipAction( this.mesh.geometry.animations[ 0 ] ).setDuration( 1 ).play();
  this.update = function(dt) {
    // compute force
	this.target.set(camera.position.x,0,camera.position.z);
    this.force = this.target.clone().sub(this.pos).setLength(this.maxSpeed).sub(this.vel);
	this.mixer.update(dt);
	groupSteer (this);
    // force clamping
    if (this.force.length() > this.maxForce)
      this.force.setLength(this.maxForce);
    this.vel.add(this.force.clone().multiplyScalar(dt));

    // velocity clamping
    if (this.vel.length() > this.maxSpeed)
      this.vel.setLength(this.maxSpeed);
    this.pos.add(this.vel.clone().multiplyScalar(dt));

    if (this.vel.length() > 0.001) {
      this.angle = Math.atan2(-this.vel.z, this.vel.x)+Math.PI/2;
    }
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.angle-Math.PI/2;

    // catch handling
    if (this.pos.distanceTo(this.target) < 2) {
      this.vel.set(0, 0, 0);
    }

  }
}
function groupSteer (myself) {
	// find ghosts in my neighborhood
  var nbhd = [];
  var R = 5;
  for (var i = 0; i < ghosts.length; i++) {
  	if (ghosts[i] === myself) {
      continue;
    }
    if (myself.pos.distanceToSquared (ghosts[i].pos) < R*R) {
    	nbhd.push (ghosts[i]);
    }
  }

 	// find separation force ... the most important one !
  for (var i = 0; i < nbhd.length; i++) {
    var r = myself.pos.distanceTo (nbhd[i].pos);
    var push = myself.pos.clone().sub(nbhd[i].pos).setLength (5/r);
    myself.force.add (push);
  }

	// find cohesion force

	// find alignment force
}
function init(){
	var buttonClick = document.getElementById ('buttonClick');//音樂播放
	$("#start").click(start);
	$(".option").hover(function(){
		buttonClick.currentTime = 0;
			buttonClick.play();});
	$("#exit").click(function(){alert("QAQ\n鼻要離開啦");window.close();});
	$("#howToPlay").click(function(){$("#howToPlayImg").show();});
	$("#howToPlayImg").click(function(){
		$( ".howToPlayImg" ).toggle("explode");});
	$("#start").click(function(){$("#loading").show();});
	loadingManager = new THREE.LoadingManager();
	loadingManager.onLoad = function(){
		$("#loading").hide();
		RESOURCES_LOADED = true;
		onResourcesLoaded();
	};
}
function start(){
	$("img").hide();
	$("hr").hide();
	$("#clock").show();
	$("#info").show();
	$("body").css("background-image","none");
	soundTrack = document.getElementById ('soundtrack');//音樂播放
	uziSound = document.getElementById ('uzi');//音樂播放
	rocketSound= document.getElementById ('rocket');//音樂播放
	screamSound= document.getElementById ('scream');//音樂播放
	scene = new THREE.Scene();//產生場景
	camera = new THREE.PerspectiveCamera(90, innerWidth/innerHeight, 0.1, 1000);//產生相機
	clock = new THREE.Clock();//時脈
	scene.fog = new THREE.Fog( 0xcce0ff, 500, 10000 );//場景顏色
	var loader2 = new THREE.JSONLoader();
	loader2.load( "models/monster.js", function( geometry ) {
					var monsterTexture = new THREE.ImageUtils.loadTexture( 'models/monster.jpg' );
					var material = new THREE.MeshPhongMaterial( {
						map:monsterTexture,
						color: 0xffffff,
						morphTargets: true,
						vertexColors: THREE.FaceColors,
						shading: THREE.FlatShading
					} );
					var flamingo = new THREE.Mesh( geometry, material );
					meshes["monster"]=flamingo;
				} );
	floorLoad();
	lightLoad();
	drawSimpleSkybox();
	$("p").hide();
	drawGUI();
	soundTrack.play();
	setTimeout(decreseTime, 1000);
	setTimeout(bornGhost,2000);
	modelsLoad();
	camera.position.set(0, player.height, -5);
	camera.lookAt(new THREE.Vector3(0,player.height,0));
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(innerWidth, innerHeight-20);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.BasicShadowMap;
	document.body.appendChild(renderer.domElement);

	animate();
    }
function bornGhost(){

	ghosts.push(new ghost(meshes["monster"].clone()));
	setTimeout(bornGhost,2000-10*Level);
}
function loadAfternoon(){
	var path = 'redSkybox/';
	var sides = [ path + 'red_west.bmp', path + 'red_east.bmp', path + 'red_up.bmp', path + 'red_down.bmp', path + 'red_south.bmp', path + 'red_north.bmp' ];
	var scCube = THREE.ImageUtils.loadTextureCube(sides);
	var skyShader = THREE.ShaderLib["cube"];
	skyShader.uniforms["tCube"].value = scCube;
	var skyMaterial = new THREE.ShaderMaterial( {
	fragmentShader: skyShader.fragmentShader, vertexShader: skyShader.vertexShader,
	uniforms: skyShader.uniforms, depthWrite: false, side: THREE.BackSide});
	}
function loaMorning(){
	var path = 'skybox/';
	var sides = [ path + 'sbox_px.jpg', path + 'sbox_nx.jpg', path + 'sbox_py.jpg', path + 'sbox_ny.jpg', path + 'sbox_pz.jpg', path + 'sbox_nz.jpg' ];
	var scCube = THREE.ImageUtils.loadTextureCube(sides);
	var skyShader = THREE.ShaderLib["cube"];
	skyShader.uniforms["tCube"].value = scCube;
	var skyMaterial = new THREE.ShaderMaterial( {
	fragmentShader: skyShader.fragmentShader, vertexShader: skyShader.vertexShader,
	uniforms: skyShader.uniforms, depthWrite: false, side: THREE.BackSide
	});
}
function modelsLoad(){
		for( var _key in models ){
			(function (key){
			var mtlLoader = new THREE.MTLLoader(loadingManager);
			mtlLoader.load(models[key].mtl, function(materials){
				materials.preload();

				var objLoader = new THREE.OBJLoader(loadingManager);

					objLoader.setMaterials(materials);
					objLoader.load(models[key].obj, function(mesh){

					models[key].mesh = mesh;
					});
				});
			}
			)(_key)
		}

}
function floorLoad(){
	var floorTexture = new THREE.ImageUtils.loadTexture( 'CSE_GO/grasslight-big.jpg' );
	floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
	floorTexture.repeat.set( 50, 50 );
	var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
	var floorGeometry = new THREE.PlaneGeometry(500, 500, 10, 10);
	var floor = new THREE.Mesh(floorGeometry, floorMaterial);
	floor.position.y = -0.5;
	floor.rotation.x = Math.PI / 2;
	scene.add(floor);
}
function lightLoad(){
	ambientLight = new THREE.AmbientLight( 0x666666,0.8 );
	scene.add(ambientLight);
	light = new THREE.PointLight(0xffffff, 1, 18);
	light.position.set(camera.position.x,6,camera.position.z);
	light.castShadow = true;
	light.shadow.camera.near = 0.1;
	light.shadow.camera.far = 25;
	scene.add(light);
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    }
function drawGUI(){
	gui = new dat.GUI(loadingManager);
	gui.domElement.id = 'gui';
	skyGUI= gui.add(player,'sky',["morning","afternoon"]).onChange(function(value) {
	if(value=="afternoon")loadAfternoon();
	else loaMorning();});
	weaponGUI = gui.add(player,'weapon', ["Rocket","Uzi"]);
	speedGUI = gui.add(player, 'speed',{ Slow: 0.1,Normal:0.3, Fast: 0.5 });
	turnSpeedGUI = gui.add(player, 'turnSpeed', 0,Math.PI*0.05);
	canShootGUI = gui.add(player, 'canShoot',0,100).listen();
	musicGUI = gui.add(player, 'music',true,false);

}
function drawSimpleSkybox() {
		var path = 'skybox/';
		var sides = [ path + 'sbox_px.jpg', path + 'sbox_nx.jpg', path + 'sbox_py.jpg', path + 'sbox_ny.jpg', path + 'sbox_pz.jpg', path + 'sbox_nz.jpg' ];
		var scCube = THREE.ImageUtils.loadTextureCube(sides);
		var skyShader = THREE.ShaderLib["cube"];
		skyShader.uniforms["tCube"].value = scCube;
		var skyMaterial = new THREE.ShaderMaterial( {
		fragmentShader: skyShader.fragmentShader, vertexShader: skyShader.vertexShader,
		uniforms: skyShader.uniforms, depthWrite: false, side: THREE.BackSide
		});
		skyBox = new THREE.Mesh(new THREE.CubeGeometry(500, 500, 500), skyMaterial);
		this.scene.add(skyBox);
}
function onResourcesLoaded(){
	// Clone models into meshes.


	meshes["tent1"] = models.tent.mesh.clone();
	meshes["tent2"] = models.tent.mesh.clone();
	meshes["campfire1"] = models.campfire.mesh.clone();
	meshes["campfire2"] = models.campfire.mesh.clone();
	meshes["pirateship"] = models.pirateship.mesh.clone();
	var tree1="tree1-";
	var x;
	var z;
	for(var i in meshes){
		x=Math.floor((Math.random() * 400)-200);
		z=Math.floor((Math.random() * 400)-200);
		meshes[i].position.set(x, 0, z);
		scene.add(meshes[i]);
	}
	for(var i=0;i<50;i++){
		x=Math.floor((Math.random() * 500)-250);
		z=Math.floor((Math.random() * 500)-250);
		var temp=""+tree1+i;
		meshes[temp] = models.tree.mesh.clone();
		meshes[temp].position.set(x, 0.5, z);
		meshes[temp].scale.set(5,5,5);
		meshes[temp].rotation.y=x;
		treeBox.push(new THREE.BoundingBoxHelper(meshes[temp], 0x00ff00));
		treeBox[i].update();
		scene.add(meshes[temp]);
	}
	for(var i=0;i<10;i++){
		ghosts.push(new ghost(meshes["monster"]));
	}
	// player weapon
	meshes["Uzi"] = models.uzi.mesh.clone();
	meshes["Uzi"].position.set(0,2,0);
	meshes["Uzi"].scale.set(10,10,10);
	weaponBox.push(new THREE.BoundingBoxHelper(meshes["Uzi"], 0x00ff00));
	weaponBox[0].update();
	scene.add(meshes["Uzi"]);
	meshes["Rocket"] = models.rocket.mesh.clone();
	meshes["Rocket"].position.set(0,2,0);
	meshes["Rocket"].scale.set(10,10,10);
	weaponBox.push(new THREE.BoundingBoxHelper(meshes["Rocket"], 0x00ff00));
	weaponBox[1].update();
	scene.add(meshes["Rocket"]);
	meshes["pokeball"] = models.pokeball.mesh.clone();
	scene.remove(meshes["monster"]);
}

function decreseTime(){
	if(gameTime<=10)document.getElementById("info").style.color="#ff0000";
	if(gameTime<=0){
		document.getElementById("info").innerHTML ="Game Over!";
		$("#clock").hide();
		player.moveAble=0;
	}
	else{gameTime--;
	player.live++;
	document.getElementById("info").innerHTML = parseInt(gameTime);
	setTimeout(decreseTime, 1000);}
}
function backgroundMusic(){
	if(player.music==false){soundtrack.volume=0;}
	else{soundtrack.volume=0.5;}
}
function moveControl(){
	if(keyboard[87]){ // W key
		camera.position.x -= Math.sin(camera.rotation.y) * player.speed*player.moveAble;
		camera.position.z -= -Math.cos(camera.rotation.y) * player.speed*player.moveAble;
	}
	if(keyboard[83]){ // S key
		camera.position.x += Math.sin(camera.rotation.y) * player.speed*player.moveAble;
		camera.position.z += -Math.cos(camera.rotation.y) * player.speed*player.moveAble;
	}
	if(keyboard[65]){ // A key
		camera.position.x += Math.sin(camera.rotation.y + Math.PI/2) * player.speed*player.moveAble;
		camera.position.z += -Math.cos(camera.rotation.y + Math.PI/2) * player.speed*player.moveAble;
	}
	if(keyboard[68]){ // D key
		camera.position.x += Math.sin(camera.rotation.y - Math.PI/2) * player.speed*player.moveAble;
		camera.position.z += -Math.cos(camera.rotation.y - Math.PI/2) * player.speed*player.moveAble;
	}
	if(keyboard[37]){ // left arrow key
		camera.rotation.y -= player.turnSpeed*player.moveAble;
	}
	if(keyboard[39]){ // right arrow key
		camera.rotation.y += player.turnSpeed*player.moveAble;
	}

}
function bulletControl(){
	for(var index=0; index<bullets.length; index+=1){
		if( bullets[index] === undefined ) continue;
		if( bullets[index].alive == false ){
			bullets.splice(index,1);//Array移除內容
			bulletsBox.splice(index,1);//Array移除內容
			continue;
		}
		for(var i=0;i<treeBox.length;i++){
		if(bulletsBox[index].box.isIntersectionBox(treeBox[i].box)){bullets[index].position.y=-10;bullets[index].alive = false}
		if(ghostsBox[i]&&bulletsBox[index].box.isIntersectionBox(ghostsBox[i].box)){
				if(weaponNumber==0){bullets[index].position.y=-10;
				bullets[index].alive = false;}
				scene.remove(ghosts[i].mesh);
				player.kill++;
				ghostsBox.splice(i,1);//Array移除內容
				ghosts.splice(i,1);//Array移除內容
				gameTime++;
				Level+=1/5;
				}
		}
		bullets[index].position.add(bullets[index].velocity);
		bulletsBox[index].update();
	}
}
function end(){
	$("#blackboard").show();
	$("#postIt").css("left","27%");
	$("#postIt2").css("left","52%");
	$("#postIt").show();
	$("#postIt2").show();
	$("#kill").css({"top":"27%","left":"23%"});
	$("#live").css({"top":"27%","left":"47%"});
	$("#kill").show();
	$("#live").show();
	$("#notetext1").html(player.kill);
	$("#notetext2").html(player.live);
	$("#notetext1").css({"top":"17%","left":"22%","color": "black", "font-size": "10vw"});
	$("#notetext2").css({"top":"17%","left":"47%","color": "black", "font-size": "10vw"});
	$("#notetext1").show();
	$("#notetext2").show();
	$("#end").css("font-size","130%");
	$("#end").show();
	//alert(player.live+","+player.kill);
	cancelAnimationFrame();
}
function animate(){
	if(gameTime<=0)end();
	//orbitcontrols.update();
	if( RESOURCES_LOADED == false ){
		requestAnimationFrame(animate);
		return;
	}
	if(camera.position.x>250){
		camera.position.x=-250;
	}
	else if(camera.position.x<-250){
		camera.position.x=250;
	}
	if(camera.position.z>250){
		camera.position.z=-250;
	}
	else if(camera.position.z<-250){
		camera.position.z=250;
	}
	backgroundMusic();
	if(player.weapon=="Uzi") weaponNumber=0;
	else{weaponNumber=1;}
	weaponBox[weaponNumber].update();
	for(var i=0;i<ghostsBox.length;i++){if(weaponBox[weaponNumber].box.isIntersectionBox(ghostsBox[i].box)){
		light.color.setHex( 0xff0000 );
		light.power=4000;
		screamSound.play();
		gameTime-=5/60;}
		setTimeout(function(){
			light.color.setHex(0xffffff);
		light.power=10;
		}, 500);
		
	}

	light.position.set(camera.position.x,6,camera.position.z);
	var time = Date.now() * 0.0005;
	var delta = clock.getDelta();
	bulletControl();
	moveControl();
	for(var i=0;i<ghosts.length;i++){
		//mixers[i].update(delta);
		ghosts[i].update(delta);
		ghostsBox[i].update();
		}
	// shoot a bullet
	if(keyboard[32] && player.canShoot <= 0 && player.moveAble==1){
		if(weaponNumber==0){
			uziSound.currentTime = 0;
			uziSound.play();
			player.canShoot = Uzi.canShootTime;
			meshes["pokeball"].scale.set(0.01,0.01,0.01);
			var bullet =meshes["pokeball"].clone();
			bullet.position.set(
			camera.position.x - Math.sin(camera.rotation.y + Math.PI/6) * 0.75,
			camera.position.y - 0.75 + Math.sin(time*4 + camera.position.x + camera.position.z)*0.01 + 0.15,
			camera.position.z + Math.cos(camera.rotation.y + Math.PI/6) * 0.75
		);
		}
		else{
			rocketSound.currentTime = 0;
			rocketSound.play();
			player.canShoot = Rocket.canShootTime;
			meshes["pokeball"].scale.set(0.05,0.05,0.05);
			var bullet =meshes["pokeball"].clone();
			bullet.position.set(
			camera.position.x - Math.sin(camera.rotation.y + Math.PI/6) * 0.75,
			camera.position.y - 1.5 + Math.sin(time*4 + camera.position.x + camera.position.z)*0.01 + 0.15,
			camera.position.z + Math.cos(camera.rotation.y + Math.PI/6) * 0.75
		);
		}
		bullet.rotation.y=camera.rotation.y;
		bullet.velocity = new THREE.Vector3(
			-Math.sin(camera.rotation.y),
			0,
			Math.cos(camera.rotation.y)
		);
		bullet.alive = true;
		setTimeout(function(){
			bullet.alive = false;
			scene.remove(bullet);
		}, 1000);
		bulletsBox.push(new THREE.BoundingBoxHelper(bullet, 0x00ff00));
		bullets.push(bullet);
		scene.add(bullet);
	}
	if(player.canShoot > 0) player.canShoot -= 1;
	if(player.weapon=="Uzi")meshes["Rocket"].position.y=-5;
	else meshes["Uzi"].position.y=-5;

	meshes[player.weapon].position.set(
	camera.position.x - Math.sin(camera.rotation.y + Math.PI/6) * 0.75,
	camera.position.y - 0.5 + Math.sin(time*4 + camera.position.x + camera.position.z)*0.01,
	camera.position.z + Math.cos(camera.rotation.y + Math.PI/6) * 0.75);
	meshes[player.weapon].rotation.set(
		camera.rotation.x,
		camera.rotation.y - Math.PI,
		camera.rotation.z
	);
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}

function keyDown(event){
	keyboard[event.keyCode] = true;
}

function keyUp(event){
	keyboard[event.keyCode] = false;
}

window.addEventListener('keydown', keyDown);
window.addEventListener('keyup', keyUp);
window.addEventListener( 'resize', onWindowResize, false );
window.onload = init;
