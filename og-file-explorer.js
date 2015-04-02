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
                $window.requestFileSystem($window.PERSISTENT, 0, function (fs) { deferred.resolve(fs) }, function (error) { deferred.reject(error) });
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
    .factory('ogFileExplorer', ["$ionicPlatform", "$ionicModal", "$ionicScrollDelegate", "ogFileSystem", "$q", "$rootScope", "$timeout", "$ionicLoading",

    function ($ionicPlatform, $ionicModal, $ionicScrollDelegate, ogFileSystem, $q, $rootScope, $timeout, $ionicLoading) {

        var servicio = {},
            fs = null,
            modal = null,
            defaultOptions = {
                templateUrl : "template/ogFileExplorer",
                icons: {
                    "mp4": "ion-videocamera",
                    "directory": "ion-ios-folder",
                    "default": "ion-document"
                },
                filter : ["*"]
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
            var q = $q.defer(),
                modalPromise = null;

            if (modal) {
                q.resolve(modal);
            } else if (!options.template) {
                console.log("fromTemplateUrl : " + options.templateUrl);
                modalPromise = $ionicModal.fromTemplateUrl(options.templateUrl , {
                    scope: options.scope,
                    hardwareBackButtonClose: false
                });
            }
            else {
                console.log("fromTemplate");
                modalPromise = $ionicModal.fromTemplate(options.template, {
                    scope: options.scope,
                    hardwareBackButtonClose: false
                });
            }

            modalPromise.then(function (elModal) {
                modal = elModal;
                q.resolve(modal);
            });


            return q.promise;
        }        


        servicio.open = function (fileExplorerOptions) {

            var options = angular.extend({},  defaultOptions, fileExplorerOptions);
            var resultdefered = $q.defer();
            options.scope = (options.scope || $rootScope).$new();
            var scope = options.scope;
            scope.currentDir = null;
            scope.entries = [];
            scope.entriesHistory = [];
            scope.selectedFiles = [];
            scope.listDirectory = listDirectory;
            scope.selectEntry = selectEntry;
            scope.accept = accept;
            scope.cancel = cancel;
            scope.getSelectedEntries = getSelectedEntries;
            scope.goBack = goBack;
            scope.canGoBack = canGoBack;
            scope.getCssClass = getCssClass;
            scope.options = options;
            scope.filterByExtensions = filterByExtensions;

            //La instancia del explorador que vamos a devolver para interactuar
            var fileExplorerInstance = {
                result: resultdefered.promise,
                scope: scope,
                modal: modal
            }

            var getFileSystemAndModalPromise = $q.all([getFileSystemPromise(), getModalPromise(options)]);

            getFileSystemAndModalPromise.then(function (fsAndModal) {
                selectEntry(fs.root);
                console.log(fsAndModal);
                modal.show();
            });

            function canGoBack() {
                return scope.entriesHistory.length > 0;
            }

            function listDirectory(directoryEntry) {
                $ionicLoading.show({ template: "loading..." });
                ogFileSystem.listDirectory(directoryEntry).then(function (entries) {
                    scope.entries.splice(0, scope.entries.length);
                    var temp = entries.filter(filterByExtensions);
                    for (var i = 0; i < temp.length; i++) {
                        temp[i].isSelected = false;
                    }
                    scope.entries = scope.entries.concat(temp);
                    $ionicScrollDelegate.scrollTop();
                    $ionicLoading.hide()
                });
            }

            function selectEntry(entry) {
                if (entry.isDirectory) {
                    if (scope.currentDir)
                        scope.entriesHistory.push(scope.currentDir);
                    scope.currentDir = entry;
                    listDirectory(entry);
                } else {
                    entry.isSelected = !entry.isSelected;
                }
            }

            function getSelectedEntries() {
                return scope.entries.filter(function (elemento, indice, arr) {
                    return elemento.isFile && elemento.isSelected;
                })
            }

            function goBack() {
                if (scope.entriesHistory.length) {
                    scope.selectedFiles.splice(0, scope.selectedFiles.length);
                    scope.currentDir = scope.entriesHistory.pop();
                    scope.listDirectory(scope.currentDir);
                }
            }

            function accept() {
                console.log("aceptar");
                resultdefered.resolve(scope.getSelectedEntries());
                modal.remove();
                modal = null;
                scope.$destroy();
            }

            function cancel() {
                resultdefered.reject();
                modal.remove();
                modal = null;
                scope.$destroy();
            }

            function getCssClass(entry) {

                if (entry.isDirectory)
                    return scope.options.icons["directory"];

                var extension = getExtension( entry.name);
                console.log(extension + " " + scope.options.icons[extension]);
                if (scope.options.icons[extension])
                    return scope.options.icons[extension];

                return scope.options.icons["default"];

            }

            function getExtension(name) {
                return name.split('.').pop();
            }

            function filterByExtensions(entry) {

                if (entry.isDirectory || !scope.options.filter || scope.options.filter=="*")
                    return true;

                var extension = getExtension(entry.name);

                return scope.options.filter.indexOf(extension) > -1;

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
      	    + "</ion-header-bar>"
            + "<ion-content>"
                + "<div class='list'>"
                    + "<a ng-repeat=\"entry in entries  |  orderBy: ['isFile','name']\" class='item item-icon-left item-text-wrap' on-tap='selectEntry(entry)'>"
	                    + "<i class'icon entry' ng-class=\"::getCssClass(entry)\"></i>"
	                    + "<label class=\"checkbox\">"
                        + "{{entry.name}}"
                        + "</label>"
	                    + "<input type='checkbox' style='float:right;right:8px' class='checkbox checkbox-energized' ng-show='entry.isFile'  ng-model='entry.isSelected' />"
	                + "</a>"
	            + "</div>"
            + "</ion-content>"
            + "<ion-footer-bar ng-class=\"bar-assertive\">"
    	        + "<div class=\"button-bar\">"
    		        + "<button class=\"button button-positive button-large\" on-tap=\"accept()\">Aceptar</button>"
    		        + "<button class=\"button button-assertive button-large\" on-tap=\"cancel()\">Cancelar</button>"
    	        + "</div>"
            + "</ion-footer-bar>"
            + "</ion-modal-view>")
    }]); //Configuracion inicial
    

})();