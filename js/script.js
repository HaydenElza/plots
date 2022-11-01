require(['catiline'], function(cw) {
    var worker = cw({
        init: function(scope) {
            importScripts('js/require.js');
            require.config({
                baseUrl: this.base
            });
            require(['shp'], function(shp) {
                scope.shp = shp;
            });
        },
        data: function(data, cb, scope) {
            this.shp(data).then(function(geoJson){
                if(Array.isArray(geoJson)){
                    geoJson.forEach(function(geo){
                        scope.json([geo, geo.fileName, true],true,scope);
                    });
                }else{
                    scope.json([geoJson, geoJson.fileName, true],true,scope);
                }
            }, function(e) {
                console.log('shit', e);
            });

        },
        color:function(s){
            //from http://stackoverflow.com/a/15710692
            importScripts('js/colorbrewer.js');
            return colorbrewer.Spectral[11][Math.abs(JSON.stringify(s).split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)) % 11];
        },
        makeString:function(buffer) {
                var array = new Uint8Array(buffer);
                var len = array.length;
                var outString = "";
                var i = 0;
                while (i < len) {
                    outString += String.fromCharCode(array[i++]);
                }
                return outString;
            },
        json: function(data, cb, scope) {
            importScripts('js/topojson.v1.min.js');
            var name = data[1];
            //console.log(name);
            var json = data.length === 2 ? JSON.parse(scope.makeString(data[0])) : data[0];
            var nom;
            if (json.type === 'Topology') {
                for (nom in json.objects) {
                    scope.layer(topojson.feature(json, json.objects[nom]), nom, scope);
                }
            }
            else {
                scope.layer(json, name, scope);
            }
        },layer:function(json,name,scope){
            
            json.features.forEach(function(feature){
                feature.properties.__color__ = scope.color(feature);
            });
            scope.fire('json',[json,name]);
        },
        base: cw.makeUrl('.')
    });
    function readerLoad() {
        if (this.readyState !== 2 || this.error) {
            return;
        }
        else {
            worker.data(this.result, [this.result]);
        }
    }

    function handleZipFile(file) {
        
        var reader = new FileReader();
        reader.onload = readerLoad;
        reader.readAsArrayBuffer(file);
    }

    function handleFile(file) {

        m.spin(true);

        // show that upload is complete
        var uploadButton = document.getElementById("upload-button");
        uploadButton.style.background = "#88ce98";
        uploadButton.style.border = "#88ce98";
        uploadButton.innerHTML = "upload complete";
        document.getElementById("input").removeAttribute("type");
        // document.getElementById("load-data-msg").style.display = "none";

        if (file.name.slice(-3) === 'zip') {
            return handleZipFile(file);
        }
        var reader = new FileReader();
        reader.onload = function() {
            var ext;
            if (reader.readyState !== 2 || reader.error) {
                return;
            }
            else {
                ext = file.name.split('.');
                ext = ext[ext.length - 1];


                worker.json([reader.result, file.name.slice(0, (0 - (ext.length + 1)))], [reader.result]);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function makeDiv() {
        var div = L.DomUtil.create('form', 'bgroup w-100');
        div.id = "dropzone";
        return div;
    }

    function makeUp(div, handleFile) {
        var upButton = L.DomUtil.create('input', 'upStuff ', div);
        upButton.type = "file";
        upButton.id = "input";
        upButton.onchange = function() {
            // var uploadButton = document.getElementById("upload-button");
            // uploadButton.style.background = "#88ce98";
            // uploadButton.style.border = "#88ce98";
            // uploadButton.innerHTML = "upload complete";

            var file = document.getElementById("input").files[0];

            handleFile(file);
            // document.getElementById("input").removeAttribute("type");
            // document.getElementById("load-data-msg").style.display = "none";

        };
        return upButton;
    }

    function setWorkerEvents() {
        worker.on('json', function(e) {
            m.spin(false);
            geoJSON = e[0];
            lc.addOverlay(L.geoJson(e[0], options).addTo(m), e[1]);
            m.fitBounds(L.geoJson(e[0], options).getBounds());

            // Adjust cell side for scale of data
            var bbox = turf.bbox(geoJSON);
            var bboxArea = turf.area(turf.bboxPolygon(bbox));
            document.getElementById("cell-side").value = Math.round(Math.sqrt(bboxArea)/20);

            // If uploaded data are points
            if (!["Polygon","MultiPolygon",""].includes(geoJSON.features[0].geometry.type)) {

                // Create concave hull containing points
                hull = turf.featureCollection([turf.concave(turf.flatten(readGeoJSON(geoJSON)))]);
        
                // Add hull polygon to map
                var polygonStyle = {
                    "color": "#ffffff",
                    "weight": 3,
                    "opacity": 0.01
                };
                hullLayer = L.geoJson([hull], {style: polygonStyle});
                hullLayer.addTo(m);
            }

        });
        worker.on('error', function(e) {
            console.warn(e);
        });
    }

    function makeDone(div, upButton) {
        var doneButton = L.DomUtil.create('button', "btn btn-dark p-3 w-100", div);
        doneButton.id = "upload-button"
        doneButton.type = "button";
        doneButton.innerHTML = "upload";
        L.DomEvent.addListener(doneButton, "click", function() {
            upButton.click();
        });
        return doneButton;
    }

    function addFunction(map) {
        // create the control container with a particular class name
        var div = makeDiv();
        var upButton = makeUp(div, handleFile);
        setWorkerEvents()
        var doneButton = makeDone(div, upButton);






        var dropbox = document.getElementById("map");
        dropbox.addEventListener("dragenter", dragenter, false);
        dropbox.addEventListener("dragover", dragover, false);
        dropbox.addEventListener("drop", drop, false);
        dropbox.addEventListener("dragleave", function() {
            m.scrollWheelZoom.enable();
        }, false);

        function dragenter(e) {
            e.stopPropagation();
            e.preventDefault();
            m.scrollWheelZoom.disable();
        }

        function dragover(e) {
            e.stopPropagation();
            e.preventDefault();
        }

        function drop(e) {
            e.stopPropagation();
            e.preventDefault();
            m.scrollWheelZoom.enable();
            var dt = e.dataTransfer;
            var files = dt.files;

            var i = 0;
            var len = files.length;
            if (!len) {
                return
            }
            while (i < len) {
                handleFile(files[i]);
                i++;
            }
        }
        return div;
    }
    var NewButton = L.Control.extend({ //creating the buttons
        options: {
            position: 'topleft'
        },
        onAdd: addFunction
    });
    //add them to the map
    m.addControl(new NewButton());

    // move upload button
    document.getElementById('upload').appendChild(
        document.getElementById('dropzone')
    );

});

function testData1() {
    var json = {"type": "FeatureCollection", "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } }, "features": [{ "type": "Feature", "properties": { "MINX": -51.190203, "MINY": 0.010940, "MAXX": -51.185213, "MAXY": 0.016550, "CNTX": -51.187708, "CNTY": 0.013745, "AREA": 0.000028, "PERIM": 0.021199, "HEIGHT": 0.005610, "WIDTH": 0.004990 }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ -51.190203007240143, 0.010939970659779 ], [ -51.190203007240143, 0.01654966489734 ], [ -51.185213168573867, 0.01654966489734 ], [ -51.185213168573867, 0.010939970659779 ], [ -51.190203007240143, 0.010939970659779 ] ] ] ] } } ] }

    geoJSON = json;
    lc.addOverlay(L.geoJson(json, options).addTo(m), "Test Box");
    m.fitBounds(L.geoJson(json, options).getBounds());
}

function testData2() {
    var json = {"type": "FeatureCollection", "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } }, "features": [{ "type": "Feature", "properties": { "id": null }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ -51.186390894470264, 0.011575322775824 ], [ -51.186305664306701, 0.011288639504133 ], [ -51.186305664306701, 0.011133675573351 ], [ -51.186437383650386, 0.011017452625233 ], [ -51.18658459938743, 0.010939970659779 ], [ -51.186731815124475, 0.010963215249423 ], [ -51.186778304304596, 0.011102682787198 ], [ -51.18679380069797, 0.011304135897191 ], [ -51.186855786271465, 0.011420358845208 ], [ -51.187041742991951, 0.011505589007058 ], [ -51.187235447909117, 0.011552078186244 ], [ -51.187514382989839, 0.011536581793186 ], [ -51.18787080003743, 0.011544329989709 ], [ -51.188188476101587, 0.01160631556194 ], [ -51.188242713478388, 0.011699293920261 ], [ -51.188351188232012, 0.011854257850725 ], [ -51.188413173805507, 0.012040214567165 ], [ -51.188242713478388, 0.011978228995035 ], [ -51.1881807279049, 0.012125444728811 ], [ -51.188203972494968, 0.012303653248563 ], [ -51.188203972494968, 0.012567091929706 ], [ -51.188219468888342, 0.012784041431625 ], [ -51.188165231511526, 0.012962249950932 ], [ -51.188250461675082, 0.013179199452507 ], [ -51.188428670198874, 0.013310918792666 ], [ -51.18858363413262, 0.01348912731159 ], [ -51.18861462691936, 0.013706076812708 ], [ -51.188568137739239, 0.013892033527799 ], [ -51.18831244724857, 0.01393852270654 ], [ -51.187894044627491, 0.013969515492376 ], [ -51.187529879383213, 0.013969515492376 ], [ -51.18742915282629, 0.013907529920717 ], [ -51.18763835413683, 0.014039249260468 ], [ -51.1877700734805, 0.014201961385953 ], [ -51.187684843316951, 0.014426659082855 ], [ -51.18763835413683, 0.014604867600928 ], [ -51.187894044627491, 0.014612615797361 ], [ -51.188250461675082, 0.014573874815181 ], [ -51.188575885935919, 0.014457651868615 ], [ -51.188746346263031, 0.014434407279289 ], [ -51.188986540360318, 0.014473148261495 ], [ -51.189118259704003, 0.014380169904204 ], [ -51.189002036753692, 0.014139975814345 ], [ -51.188986540360318, 0.01393852270654 ], [ -51.189164748884124, 0.013892033527799 ], [ -51.189420439374778, 0.013969515492376 ], [ -51.189544410521769, 0.014039249260468 ], [ -51.189676129865447, 0.014341428921985 ], [ -51.189831093799178, 0.014442155475735 ], [ -51.190017050519664, 0.014271695153982 ], [ -51.190203007240143, 0.014302687939754 ], [ -51.190148769863335, 0.014566126618748 ], [ -51.189955064946169, 0.014852809886711 ], [ -51.189722619045568, 0.015162737743542 ], [ -51.189621892488638, 0.01547266559994 ], [ -51.189784604619057, 0.015573392153181 ], [ -51.189745863635622, 0.01570511149194 ], [ -51.189412691178092, 0.01581358624145 ], [ -51.189095015113935, 0.015782593455881 ], [ -51.188909058393456, 0.01582908263424 ], [ -51.189071770523881, 0.016015039347537 ], [ -51.188932302983517, 0.016278478024419 ], [ -51.188761842656405, 0.016046032133068 ], [ -51.188653367902788, 0.015960801972846 ], [ -51.188258209871769, 0.016208744257039 ], [ -51.187956030200986, 0.016270729828049 ], [ -51.1877700734805, 0.016355959988156 ], [ -51.187367167252795, 0.016503175719146 ], [ -51.187157965942255, 0.01654966489734 ], [ -51.187126973155515, 0.016235862944365 ], [ -51.187003002008524, 0.015887194107173 ], [ -51.18677830430461, 0.01577871935769 ], [ -51.18667757774768, 0.015530777072975 ], [ -51.186569102994063, 0.015251842002311 ], [ -51.186274671519975, 0.014980655127723 ], [ -51.185848520702187, 0.014817943002811 ], [ -51.185678060375082, 0.014957410538461 ], [ -51.185747794145264, 0.015081381681181 ], [ -51.185802031522066, 0.015267338395152 ], [ -51.185771038735325, 0.015352568555654 ], [ -51.185956995455797, 0.015468791501762 ], [ -51.185956995455797, 0.01567024460818 ], [ -51.185786535128685, 0.015724481982948 ], [ -51.185569585621465, 0.01567024460818 ], [ -51.185360384310918, 0.015561769858582 ], [ -51.185213168573867, 0.015445546912538 ], [ -51.185267405950682, 0.015321575770021 ], [ -51.18550760004797, 0.015352568555654 ], [ -51.185546341031397, 0.015220849216666 ], [ -51.185592830211519, 0.014996151520565 ], [ -51.185685808571762, 0.014833439395665 ], [ -51.185926002669049, 0.014709468252793 ], [ -51.186297916110021, 0.014771453824235 ], [ -51.186669829550979, 0.015220849216666 ], [ -51.186917771844961, 0.01552302887658 ], [ -51.187095980368753, 0.015585014447794 ], [ -51.187266440695865, 0.015701237393762 ], [ -51.187560872169961, 0.015507532483777 ], [ -51.187700339710325, 0.015461043305354 ], [ -51.1877700734805, 0.01532932396643 ], [ -51.188118742331419, 0.015399057734102 ], [ -51.188327943641958, 0.015259590198732 ], [ -51.188661116099482, 0.015089129877602 ], [ -51.188738598066358, 0.01490317316349 ], [ -51.18861462691936, 0.014817943002811 ], [ -51.188250461675082, 0.014879928574215 ], [ -51.187700339710325, 0.014895424967069 ], [ -51.18732842626936, 0.014887676770636 ], [ -51.187165714138942, 0.014662979074192 ], [ -51.187212203319064, 0.014384044002433 ], [ -51.187196706925683, 0.014221331877088 ], [ -51.186979757418456, 0.014012130572887 ], [ -51.186817045288031, 0.0139578931977 ], [ -51.186545858403996, 0.013841670250816 ], [ -51.186398642666944, 0.013609224356882 ], [ -51.186150700372977, 0.013531742392191 ], [ -51.185933750865743, 0.013462008623946 ], [ -51.185895009882309, 0.013276051908524 ], [ -51.186305664306701, 0.013082346996478 ], [ -51.18678605250129, 0.013105591585931 ], [ -51.186910023648274, 0.013260555515568 ], [ -51.187111476762134, 0.013400023052147 ], [ -51.18732842626936, 0.013438764034518 ], [ -51.187661598726898, 0.013562735178077 ], [ -51.187692591513638, 0.013462008623946 ], [ -51.187351670859421, 0.013299296497964 ], [ -51.187243196105804, 0.013128836175384 ], [ -51.187297433482605, 0.012904138477261 ], [ -51.187382663646169, 0.012725929957929 ], [ -51.187219951515743, 0.012408253901407 ], [ -51.187080483975379, 0.012292030953811 ], [ -51.186677577747673, 0.012385009311891 ], [ -51.186336657093449, 0.012261038167771 ], [ -51.186119707586222, 0.012113822434046 ], [ -51.186204937749778, 0.011912369324625 ], [ -51.186282419716647, 0.011765153590722 ], [ -51.186390894470264, 0.011575322775824 ] ] ] ] } } ] }

    geoJSON = json;
    lc.addOverlay(L.geoJson(json, options).addTo(m), "Irregular Shape");
    m.fitBounds(L.geoJson(json, options).getBounds());
}

function testData3() {
    var json = {"type": "FeatureCollection", "name": "uwarboretum", "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } }, "features": [{ "type": "Feature", "properties": { }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ -89.442589055818573, 43.039979921594096 ], [ -89.438672807868343, 43.039882180497266 ], [ -89.438562271284212, 43.038947174942244 ], [ -89.434466953854596, 43.03890954445712 ], [ -89.433382593825286, 43.039008980544857 ], [ -89.433039425881759, 43.03878021513728 ], [ -89.434055239378424, 43.03836604443056 ], [ -89.434231974111796, 43.038567784244506 ], [ -89.434898194751653, 43.038623475642467 ], [ -89.434794092139086, 43.038291096034754 ], [ -89.435056570245337, 43.038231258900993 ], [ -89.436829744428195, 43.038318597952021 ], [ -89.437071763020555, 43.03789185674043 ], [ -89.436861701015076, 43.037427958150808 ], [ -89.435888517291701, 43.037091299772221 ], [ -89.435735911486105, 43.036854748209073 ], [ -89.435245962258293, 43.037053197532835 ], [ -89.434913340912402, 43.036972955910649 ], [ -89.434305941428178, 43.03699615511151 ], [ -89.433567746269105, 43.037001237195561 ], [ -89.433415712058064, 43.03670355222998 ], [ -89.433668608680023, 43.036390404945536 ], [ -89.433218068794716, 43.036187308521214 ], [ -89.431932982036813, 43.03611107056647 ], [ -89.431026837881518, 43.036255035407663 ], [ -89.430444384835042, 43.036156071852155 ], [ -89.429551354997656, 43.036169090678506 ], [ -89.429013609874289, 43.036384741696871 ], [ -89.428415930774605, 43.036643757386869 ], [ -89.42761634788215, 43.036849360491395 ], [ -89.426914682190557, 43.036767249301704 ], [ -89.42627083486839, 43.036868823079871 ], [ -89.42561279968902, 43.037214854549418 ], [ -89.425295524494771, 43.038042925579809 ], [ -89.425204847201542, 43.037553405207753 ], [ -89.424846064006175, 43.036451206309415 ], [ -89.424278463392184, 43.036037887018928 ], [ -89.423814009959187, 43.036053016239194 ], [ -89.423792733193352, 43.035782176631429 ], [ -89.426317044503875, 43.035742458292773 ], [ -89.42878053304517, 43.035842113615061 ], [ -89.432828906131533, 43.035783648447506 ], [ -89.435210756161055, 43.035699361284728 ], [ -89.438451260197496, 43.035453308050315 ], [ -89.442380712393799, 43.035376454759202 ], [ -89.442469546824071, 43.036084285525916 ], [ -89.44248924561542, 43.036538513472358 ], [ -89.442497592984211, 43.03693155293891 ], [ -89.442637450472262, 43.037264099782512 ], [ -89.442371029744265, 43.037760600387784 ], [ -89.442685595227275, 43.038521930163903 ], [ -89.442589055818573, 43.039979921594096 ] ] ] ] } }, { "type": "Feature", "properties": { }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ -89.423681203720591, 43.038794604899351 ], [ -89.424932553084034, 43.04057594289074 ], [ -89.426072737846454, 43.040878598655468 ], [ -89.427675260196352, 43.040118093588248 ], [ -89.427471452642862, 43.041549335211911 ], [ -89.426085316421378, 43.042083856832662 ], [ -89.426578438214761, 43.04538751398259 ], [ -89.426983428113076, 43.04537207590112 ], [ -89.427120132215492, 43.046036490452408 ], [ -89.42922658120564, 43.044876754420066 ], [ -89.431562531700536, 43.044643848673033 ], [ -89.427865448998688, 43.047839276626547 ], [ -89.422409186459149, 43.048108800704561 ], [ -89.421453642688263, 43.045885718685838 ], [ -89.418570555560891, 43.046045773210061 ], [ -89.417333240814187, 43.045934680828744 ], [ -89.416874667023805, 43.045321014818413 ], [ -89.415839451320664, 43.045245869033543 ], [ -89.415439269258471, 43.04475476133662 ], [ -89.415741988185587, 43.044223576367081 ], [ -89.415001923113451, 43.04316306729163 ], [ -89.407382363150674, 43.043080198411054 ], [ -89.407338053150411, 43.042117123282146 ], [ -89.407624133538292, 43.042083671251902 ], [ -89.407990550128915, 43.041124904766484 ], [ -89.408810375552932, 43.040063680457969 ], [ -89.408506701658368, 43.039450780456619 ], [ -89.413534295022814, 43.036612131658885 ], [ -89.413476860575869, 43.037642367084729 ], [ -89.414165532196591, 43.037838027062463 ], [ -89.414156891707734, 43.038746246172536 ], [ -89.423681203720591, 43.038794604899351 ] ] ] ] } } ] }

    geoJSON = json;
    lc.addOverlay(L.geoJson(json, options).addTo(m), "UW Arboretum");
    m.fitBounds(L.geoJson(json, options).getBounds());
}