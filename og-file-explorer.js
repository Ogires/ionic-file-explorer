/// <reference path="../lib/angular/angular.js" />

(function () {

    angular.module("ogUtils", [])
    .factory("ogFileSystem", ["$q", "$window", function ($q, $window) {
        var fs = null;
        var getFileSystem = function () {
            var deferred = $q.defer();
            if (fs != null) {
                deferred.resolve(fs);
            } else {
                $window.requestFileSystem($window.PERSISTENT, 0, function (fs) { deferred.resolve(fs) }, function () { deferred.reject() });
            }
            return deferred.promise;
        }

        var listDirectory = function (dirEntry) {
            var deferred = $q.defer();
            var reader = dirEntry.createReader();
            reader.readEntries(
                function (entries) { deferred.resolve(entries) },
                function (error) { deferred.reject(error) });
            return deferred.promise;
        }

        return {
            getFileSystem: getFileSystem,
            listDirectory: listDirectory

        }

    }])
    .factory('ogFileExplorerService', ["$ionicPlatform", "$ionicModal", "$ionicScrollDelegate", "ogFileSystem", "$q", "$rootScope", "$timeout", "$ionicLoading",

    function ($ionicPlatform, $ionicModal, $ionicScrollDelegate, ogFileSystem, $q, $rootScope, $timeout, $ionicLoading) {

        var servicio = {},
            fs = null,
            modal = null,
            defaultOptions = {
                icons: {
                    "mp4": "ion-videocamera",
                    "directory": "ion-ios-folder",
                    "default": "ion-document"
                },
                filtro : ["*"]
            };

        $ionicPlatform.onHardwareBackButton(function (event) {
            console.log("onHardwareBackButton");
            if (modal && modal.scope.canGoBack()) {
                event.preventDefault();
                modal.scope.goBack();
            } else {
                modal.scope.cancelar();
            }
        });

        function getFileSystemPromise() {
            var q = $q.defer();
            if (fs) {
                q.resolve(fs)
            }
            else {
                ogFileSystem.getFileSystem().then(function (result) {
                    fs = result;
                    q.resolve(fs);
                });
            }
            return q.promise;
        }

        function getModalPromise(options) {
            var q = $q.defer();

            if (modal) {
                q.resolve(modal);
            } else {
                $ionicModal.fromTemplateUrl(options.template || "template/ogFileExplorer", {
                    scope: options.scope,
                    hardwareBackButtonClose: false
                }).then(function (elModal) {
                    modal = elModal;
                    q.resolve(modal);
                });
            }

            return q.promise;
        }

        servicio.open = function (fileExplorerOptions) {

            var options = angular.extend({}, defaultOptions, fileExplorerOptions);
            var resultdefered = $q.defer();
            var scope = (fileExplorerOptions.scope || $rootScope).$new();
            scope.$on("$destroy", function () { console.log("Destroy del scope") })
            scope.currentDir = null;
            scope.entries = [];
            scope.entriesHistory = [];
            scope.selectedFiles = [];
            scope.listarDirectorio = listarDirectorio;
            scope.seleccionar = seleccionar;
            scope.aceptar = aceptar;
            scope.cancelar = cancelar;
            scope.obtenerSeleccion = obtenerSeleccion;
            scope.goBack = goBack;
            scope.canGoBack = canGoBack;
            scope.seleccionarClase = seleccionarClase;
            scope.options = options;
            scope.filtrarExtensiones = filtrarExtensiones;

            //La instancia del explorador que vamos a devolver para interactuar
            var fileExplorerInstance = {
                result: resultdefered.promise,
                scope: scope,
                modal: modal
            }

            var obtenerFileSystemYModalPromise = $q.all([getFileSystemPromise(), getModalPromise({ scope: scope })]);

            obtenerFileSystemYModalPromise.then(function (fsAndModal) {
                seleccionar(fs.root);
                console.log(fsAndModal);
                modal.show();
            });

            function canGoBack() {
                return scope.entriesHistory.length > 0;
            }

            function listarDirectorio(directoryEntry) {
                $ionicLoading.show({ template: "loading..." });
                ogFileSystem.listDirectory(directoryEntry).then(function (entries) {
                    scope.entries.splice(0, scope.entries.length);
                    var temp = entries.filter(filtrarExtensiones);
                    for (var i = 0; i < temp.length; i++) {
                        temp[i].isSelected = false;
                    }
                    scope.entries = scope.entries.concat(temp);
                    $ionicScrollDelegate.scrollTop();
                    $ionicLoading.hide()
                });
            }

            function seleccionar(entry) {
                if (entry.isDirectory) {
                    if (scope.currentDir)
                        scope.entriesHistory.push(scope.currentDir);
                    scope.currentDir = entry;
                    listarDirectorio(entry);
                } else {
                    entry.isSelected = !entry.isSelected;
                }
            }

            function obtenerSeleccion() {
                return scope.entries.filter(function (elemento, indice, arr) {
                    return elemento.isFile && elemento.isSelected;
                })
            }

            function goBack() {
                if (scope.entriesHistory.length) {
                    scope.selectedFiles.splice(0, scope.selectedFiles.length);
                    scope.currentDir = scope.entriesHistory.pop();
                    scope.listarDirectorio(scope.currentDir);
                }
            }

            function aceptar() {
                console.log("aceptar");
                resultdefered.resolve(scope.obtenerSeleccion());
                modal.remove();
                modal = null;
                scope.$destroy();
            }

            function cancelar() {
                resultdefered.reject();
                modal.remove();
                modal = null;
                scope.$destroy();
            }

            function seleccionarClase(entry) {

                if (entry.isDirectory)
                    return scope.options.icons["directory"];

                var extension = entry.name.split('.').pop();
                console.log(extension + " " + scope.options.icons[extension]);
                if (scope.options.icons[extension])
                    return scope.options.icons[extension];

                return scope.options.icons["default"];

            }

            function obtenerExtension(name) {
                return name.split('.').pop();
            }

            function filtrarExtensiones(entry) {

                if (entry.isDirectory || !scope.options.filtro || scope.options.filtro=="*")
                    return true;
                var extension = obtenerExtension(entry.name);

                return scope.options.filtro.indexOf(extension) > -1;

            }

            return fileExplorerInstance;

        }; //servicio.open

        return servicio;

    }])

    .run(["$templateCache", function ($templateCache) {
        $templateCache.put("template/ogFileExplorer",
            "<ion-modal-view has-footer has-header>"
                + "<ion-header-bar class='bar-assertive'>"
    	        + "<button class='button button-icon icon ion-arrow-left-c button-clear' on-tap='goBack()' ></button>"
                + "<h1 class='title'>{{currentDir.fullPath}}</h1>"
      	        + "<button class='button button-icon icon ion-navicon'></button>"
      	    + "</ion-header-bar>"
            + "<ion-content>"
                + "<div class='list'>"
                    + "<a ng-repeat=\"entry in entries  |  orderBy: ['isFile','name']\" class='item item-icon-left item-text-wrap' on-tap='seleccionar(entry)'>"
	                    + "<i class'icon entry' ng-class=\"::seleccionarClase(entry)\"></i>"
	                    + "<label class=\"checkbox\">"
                        + "{{entry.name}}"
                        + "</label>"
	                    + "<input type='checkbox' style='float:right;right:8px' class='checkbox checkbox-energized' ng-show='entry.isFile'  ng-model='entry.isSelected' />"
	                + "</a>"
	            + "</div>"
            + "</ion-content>"
            + "<ion-footer-bar ng-class=\"bar-assertive\">"
    	        + "<div class=\"button-bar\">"
    		        + "<button class=\"button button-positive\" on-tap=\"aceptar()\">Aceptar</button>"
    		        + "<button class=\"button button-assertive\" on-tap=\"cancelar()\">Cancelar</button>"
    	        + "</div>"
            + "</ion-footer-bar>"
            + "</ion-modal-view>")
    }]); //Configuracion inicial
    

})();