/**
 * ----------------------------------------------------------------------------
 * Host model Service
 * Refreshes the server model
 * ----------------------------------------------------------------------------
 */
adminModule.service('HostModelService', ['$http', '$q', '$rootScope', '$log', 'ServerService', function ($http, $q, $rootScope, $log, ServerService) {

    this.data = {
        model: {},
        selectedDatabase: null
    }

    var self = this;
    this.IsLoaded = false;

    this._wantedSelectedDatabaseName = "";

    this._deferred = $q.defer();
    this.serverStatus = new Palindrom({
        remoteUrl: "/api/servermodel",
        useWebSocket: true,
        pingInterval: 30,
        onStateReset: function (obj) {
            
            $rootScope.$apply();
            self.data.model = obj.Administrator_0;

            ServerService.refreshServerSettings(function () {
                // Success
                self.IsLoaded = true;
                self.data.selectedDatabase = self.getDatabase(self._wantedSelectedDatabaseName);
                self._deferred.resolve('loaded');

            },
            function (messageObject) {
                // Error
                self.IsLoaded = true;
                self.data.selectedDatabase = self.getDatabase(self._wantedSelectedDatabaseName);
                self._deferred.resolve('loaded');
            });
        }
    });

    var _filterChangedCallback = this.serverStatus.filterChangedCallback.bind(this.serverStatus);
    this.serverStatus.filterChangedCallback = function (patch) {
        if (patch.path.indexOf("/$$") == -1) {
            _filterChangedCallback(patch);
        }
    };    

    this.serverStatus.onRemoteChange = function (patches) {

        if (patches.length) { //if server replied with some non-empty sequence of patches
            $rootScope.$apply();
        }
    }

    Puppet.isApplicationLink = function () {
        return false;
    }

    this.waitForModel = function () {

        if (self.IsLoaded == true) {
            self._deferred.resolve('loaded');
        }
        return self._deferred.promise;
    }

    this.setDatabase = function (databaseName) {

        var deferred = $q.defer();

        this.waitForModel().then(function () {

            var database = self.getDatabase(databaseName);
            if (database != null) {
                self.data.selectedDatabase = database;
                deferred.resolve({ success: true, result: "database set" });
            }
            else {
                deferred.reject({ success: false, result: "database not found", databaseNotFound: true });
            }
        });
        return deferred.promise;
    }

    /**
     * Get database
     * @param {string} id Databasename
     */
    this.getDatabase = function (id) {
        if (this.data.model) {
            var databases = this.data.model.Databases;
            for (var i = 0; i < databases.length ; i++) {
                if (databases[i].ID == id) {
                    return databases[i];
                }
            }
        }
        return null;
    }

    /**
     * Get database
     * @param {object} database Database
     * @param {string} appid Application ID
     * @return {object} Application or null
     */
    this.getApplication = function (database, appid) {

        if (database == null) return null;

        for (var i = 0; i < database.Applications.length ; i++) {
            if (database.Applications[i].ID == appid) {
                return database.Applications[i];
            }
        }
        return null;
    }
}]);