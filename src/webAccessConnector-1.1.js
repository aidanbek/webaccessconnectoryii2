// webAccessConnector library for LANDESK Service Desk Web Access integrations
// v1.1, Oct 8 2014
// Stu McNeill / LANDESK

// Documentation and support: https://community.landesk.com/support/docs/DOC-30875


/**
 * The main interface
 *
 * @param {Object} connectionInfo
 * @param {string} connectionInfo.webAccessUrl
 * @param {boolean|undefined} connectionInfo.loginOnDemand
 * @param {string} connectionInfo.loginUser
 * @param {string} connectionInfo.loginPass
 * @param {boolean|undefined} connectionInfo.loginOnDemandAutoLogOff
 */
var webAccessConnector = function (connectionInfo) {
    var self = this;

    // Query Commands: query.runConsoleQuery, query.runQuery
    this.query = {
        /**
         * Run a query designed in Console.
         * Sorting and criteria are applied but columns are not returned.
         * If columns are required use a Web Access query or report template.
         *
         * @param {Object} parameters
         * @param {string} parameters.className
         * @param {string} parameters.queryName
         * @param {string} parameters.templateName
         * @param {number} parameters.pageSize
         * @param {function} parameters.onLoad
         * @param {function} parameters.onError
         */
        runConsoleQuery: function (parameters) {
            var queryData = {
                class_name: parameters.className,
                query: parameters.queryName
            };

            if (parameters.templateName) {
                queryData.template = parameters.templateName;
            }

            if (parameters.pageSize) {
                queryData.page_size = parameters.pageSize;
            }

            self.query.runQuery({
                queryData: queryData, onLoad: parameters.onLoad, onError: parameters.onError
            });
        },

        /**
         * Run a query
         *
         * @param {Object} parameters
         * @param {Object} parameters.queryData
         * @param {function} parameters.onLoad
         * @param {function} parameters.onError
         */
        runQuery: function (parameters) {
            var commandPath = "/query/list.rails";
            var request = new webAccessConnector.webAccessRequest({
                connectionInfo: connectionInfo,
                commandPath: commandPath,
                requestType: webAccessConnector.requestType.get,
                requestData: parameters.queryData,
                onLoad: parameters.onLoad,
                onError: parameters.onError,
                responseProcessor: self.query._queryResponseProcessor,
                requireJSON: true
            });
            request.go();
        },

        /**
         *
         * @param {Object} responseData
         * @param {string|number} responseData.pageCount
         * @param {number} responseData.objectCount
         * @param {Array} responseData.objects
         * @param response
         * @private
         */
        _queryResponseProcessor: function (responseData, response) {
            // fix the objectCount that is always 0 when pageCount is 1.
            if (responseData.pageCount == 1) {
                responseData.objectCount = responseData.objects.length;
            }
        }

    };

    // Record Commands: record.createRecord, record.createProcessRecord, record.openRecord, record.updateRecord, record.deleteRecord
    this.record = {
        /**
         * Save a new record
         *
         * @param {Object} parameters
         * @param {string} parameters.className
         * @param {Object} parameters.attributeValues
         * @param {function} parameters.onLoad
         * @param {function} parameters.onError
         */
        createRecord: function (parameters) {
            var createData = self.record._prepareSaveData(parameters.className, true, parameters.attributeValues);
            self.record._save(createData, parameters.onLoad, parameters.onError);
        },

        /**
         * Save a new process record specifying the lifecycle and template (optional)
         *
         * @param {Object} parameters
         * @param {string} parameters.className
         * @param {?string} parameters.lifecycleName
         * @param {?string} parameters.templateName
         * @param {Object} parameters.attributeValues
         * @param {function} parameters.onLoad
         * @param {function} parameters.onError
         */
        createProcessRecord: function (parameters) {
            var createData = self.record._prepareSaveData(parameters.className, true, parameters.attributeValues);

            if (parameters.lifecycleName) {
                createData.lifecycle_name = parameters.lifecycleName;
            }

            if (parameters.templateName) {
                createData.object_template_name = parameters.templateName;
            }

            self.record._save(createData, parameters.onLoad, parameters.onError);
        },

        /**
         * Open a record
         *
         * @param {Object} parameters
         * @param {string} parameters.className
         * @param {string} parameters.key
         * @param {function} parameters.onLoad
         * @param {function} parameters.onError
         */
        openRecord: function (parameters) {
            var openData = {
                class_name: parameters.className,
                key: parameters.key
            };
            var commandPath = "/object/open.rails";
            var request = new webAccessConnector.webAccessRequest({
                connectionInfo: connectionInfo,
                commandPath: commandPath,
                requestType: webAccessConnector.requestType.get,
                requestData: openData,
                onLoad: parameters.onLoad,
                onError: parameters.onError,
                requireJSON: true
            });
            request.go();
        },

        /**
         * Save changes to an existing record
         *
         * @param {Object} parameters
         * @param {string} parameters.className
         * @param {string} parameters.key
         * @param {Object} parameters.attributeValues
         * @param {function} parameters.onLoad
         * @param {function} parameters.onError
         */
        updateRecord: function (parameters) {
            var updateData = self.record._prepareSaveData(parameters.className, false, parameters.attributeValues);
            updateData.key = parameters.key;
            self.record._save(updateData, parameters.onLoad, parameters.onError);
        },

        /**
         * Delete an existing record
         *
         * @param {Object} parameters
         * @param {string} parameters.className
         * @param {string} parameters.key
         * @param {function} parameters.onLoad
         * @param {function} parameters.onError
         */
        deleteRecord: function (parameters) {
            var deleteData = {
                class_name: parameters.className,
                key: parameters.key
            };
            var commandPath = "/object/delete.rails";
            var request = new webAccessConnector.webAccessRequest({
                connectionInfo: connectionInfo,
                commandPath: commandPath,
                requestType: webAccessConnector.requestType.post,
                requestData: deleteData,
                onLoad: parameters.onLoad,
                onError: parameters.onError,
                requireJSON: true
            });
            request.go();
        },

        /**
         *
         * @param {string} className
         * @param {boolean} isNew
         * @param {object} attributeValues
         * @returns {Object}
         * @private
         */
        _prepareSaveData: function (className, isNew, attributeValues) {
            var createData = {};
            if (attributeValues) {
                createData = JSON.parse(JSON.stringify(attributeValues));
            }
            createData.class_name = className;
            createData.is_new = isNew;
            return createData;
        },

        /**
         *
         * @param {Object} saveData
         * @param {function} onLoad
         * @param {function} onError
         * @private
         */
        _save: function (saveData, onLoad, onError) {
            var commandPath = "/object/save.rails";
            var request = new webAccessConnector.webAccessRequest({
                connectionInfo: connectionInfo,
                commandPath: commandPath,
                requestType: webAccessConnector.requestType.post,
                requestData: saveData,
                onLoad: onLoad,
                onError: onError,
                requireJSON: true
            });
            request.go();
        }

    };

    // Action Commands: action.collectionAction, action.updateAction, action.windowlessAction, action.attachDetachAction
    this.action = {
        /**
         * Perform a collection action
         *
         * @param {Object} parameters
         * @param {string} parameters.processClassName
         * @param {string} parameters.processKey
         * @param {string} parameters.actionName
         * @param {string} parameters.collectionClassName
         * @param {Object} parameters.attributeValues
         * @param {function} parameters.onLoad
         * @param {function} parameters.onError
         */
        collectionAction: function (parameters) {
            var actionData = self.record._prepareSaveData(parameters.collectionClassName, true, parameters.attributeValues);
            actionData.parent_class_name = parameters.processClassName;
            actionData.parent_key = parameters.processKey;
            actionData.parent_function_name = parameters.actionName;
            self.record._save(actionData, parameters.onLoad, parameters.onError);
        },

        /**
         * Perform an update action
         *
         * @param {Object} parameters
         * @param {string} parameters.className
         * @param {string} parameters.key
         * @param {string} parameters.actionName
         * @param {Object} parameters.attributeValues
         * @param {function} parameters.onLoad
         * @param {function} parameters.onError
         */
        updateAction: function (parameters) {
            var actionData = self.record._prepareSaveData(parameters.className, false, parameters.attributeValues);
            actionData.key = parameters.key;
            actionData.function_name = parameters.actionName;
            self.record._save(actionData, parameters.onLoad, parameters.onError);
        },

        /**
         * Perform a windowless action
         *
         * @param {Object} parameters
         * @param {string} parameters.className
         * @param {string} parameters.key
         * @param {string} parameters.actionName
         * @param {function} parameters.onLoad
         * @param {function} parameters.onError
         */
        windowlessAction: function (parameters) {
            var actionData = {
                class_name: parameters.className,
                key: parameters.key,
                function_name: parameters.actionName,
                is_new: false
            };
            self.action._invokeFunction(actionData, parameters.onLoad, parameters.onError, false);
        },

        /**
         * Perform an attach or detach (parent/child, module-to-module) action
         *
         * @param {Object} parameters
         * @param {string} parameters.className
         * @param {string} parameters.key
         * @param {string} parameters.actionName
         * @param {string} parameters.linkedClassName
         * @param {string} parameters.linkedKey
         * @param {function} parameters.onLoad
         * @param {function} parameters.onError
         */
        attachDetachAction: function (parameters) {
            var actionData = {
                class_name: parameters.className,
                key: parameters.key,
                function_name: parameters.actionName,
                child_class_name: parameters.linkedClassName,
                child_key: parameters.linkedKey,
                is_new: false
            };
            self.action._invokeFunction(actionData, parameters.onLoad, parameters.onError, true);
        },

        /**
         *
         * @param {Object} actionData
         * @param {function} onLoad
         * @param {function} onError
         * @param {boolean} requireJSON
         * @private
         */
        _invokeFunction: function (actionData, onLoad, onError, requireJSON) {
            var commandPath = "/object/invokeFunction.rails";
            var request = new webAccessConnector.webAccessRequest({
                connectionInfo: connectionInfo,
                commandPath: commandPath,
                requestType: webAccessConnector.requestType.post,
                requestData: actionData,
                onLoad: onLoad,
                onError: onError,
                requireJSON: requireJSON
            });
            request.go();
        }

    };

    // Metadata commands: metadata.getModules, metadata.getObjectsInModule, metadata.getModule, metadata.getObject, metadata.getAttributesInObject
    this.metadata = {

        // getModules: get list of modules
        // parameters: onLoad, onError
        getModules: function (parameters) {
            var queryData = {
                class_name: "Metadata.Module", attributes: "Name,DatabasePrefix,IsClone,IsExternal", page_size: 999
            };

            var getModulesOnLoad = function (result) {
                if (!parameters.onLoad) {
                    return;
                }

                var modulesArray = [];

                for (var i = 0; i < result.data.objects.length; i++) {
                    var item = result.data.objects[i];
                    var attribute = {
                        guid: item.value,
                        name: item.attributes["Name"],
                        title: item.name,
                        databasePrefix: item.attributes["DatabasePrefix"],
                        isExternal: item.attributes["IsExternal"],
                        isClone: item.attributes["IsClone"]
                    };
                    modulesArray.push(attribute);
                }

                modulesArray.sort(function (a, b) {
                    var titleA = a.title.toLowerCase();
                    var titleB = b.title.toLowerCase();

                    if (titleA < titleB) {
                        return -1;
                    }

                    if (titleA > titleB) {
                        return 1;
                    }

                    return 0;
                });

                result.data = {modules: modulesArray};
                parameters.onLoad(result);
            };

            self.query.runQuery({queryData: queryData, onLoad: getModulesOnLoad, onError: parameters.onError});
        },

        // getObjectsForModule: get list of objects in a given module
        // parameters: moduleGuid, onLoad, onError
        getObjectsForModule: function (parameters) {
            var queryData = {
                cns: "Module.Guid-e-0", c0: parameters.moduleGuid
            };
            self.metadata._getObjects(queryData, "list", parameters.onLoad, parameters.onError);
        },

        // getObject: get information about an object
        // parameters: className / objectGuid, onLoad, onError
        getObject: function (parameters) {
            var queryData = {};
            if (parameters.className) {
                var objectArray = parameters.className.split(".");
                queryData = {
                    cns: "Module.Name-e-0_a_Name-e-1",
                    c0: objectArray[0],
                    c1: objectArray[1]
                };
            } else {
                queryData = {
                    cns: "Guid-e-0",
                    c0: parameters.objectGuid
                };
            }
            self.metadata._getObjects(queryData, "single", parameters.onLoad, parameters.onError);
        },

        // getAttributesForObject: get list of attributes for a given object
        // parameters: objectGuid, onLoad, onError
        getAttributesForObject: function (parameters) {
            var attributesArray = [];
            var attributeNames = [];

            var getAttributes = function (objectGuid) {
                var queryData = {
                    class_name: "Metadata.AttributeType",
                    attributes: "DataType,Name,RelatedClassType.Guid,IsName,PKeyNumber,Class.SuperClassType.Guid",
                    cns: "Class.Guid-e-0",
                    c0: objectGuid,
                    page_size: 999
                };

                self.query.runQuery({queryData: queryData, onLoad: getAttributesOnLoad, onError: parameters.onError});
            }

            var getAttributesOnLoad = function (result) {
                var parentObjectGuid = "";
                for (var i = 0; i < result.data.objects.length; i++) {
                    var item = result.data.objects[i];
                    if (attributeNames.indexOf(item.attributes["Name"]) == -1) {
                        var attribute = {
                            guid: item.value,
                            name: item.attributes["Name"],
                            title: item.name,
                            type: item.attributes["DataType"],
                            relatedClass: item.attributes["RelatedClassType.Guid"],
                            isName: (item.attributes["IsName"] == "True") ? true : false,
                            isPrimaryKey: (item.attributes["PKeyNumber"] == "1") ? true : false
                        }
                        attributesArray.push(attribute);
                        attributeNames.push(attribute.name);
                    }
                    parentObjectGuid = item.attributes["Class.SuperClassType.Guid"];
                }

                if (parentObjectGuid != "") {
                    getAttributes(parentObjectGuid);
                    return;
                }

                attributesArray.sort(function (a, b) {
                    var titleA = a.title.toLowerCase();
                    var titleB = b.title.toLowerCase();

                    if (titleA < titleB) {
                        return -1;
                    }

                    if (titleA > titleB) {
                        return 1;
                    }

                    return 0;
                });

                result.data = {attributes: attributesArray};
                parameters.onLoad(result);
            }

            getAttributes(parameters.objectGuid);
        },

        // internal metadata functions
        _getObjects: function (queryData, getType, onLoad, onError) {
            queryData.class_name = "Metadata.ClassType";
            queryData.attributes = "Name,Module.Guid,Module.Name,Module.Title,SuperClassType.Module.Name,SuperClassType.Name,Table.Name";
            queryData.page_size = 999;

            var getObjectsOnLoad = function (result) {
                var objectsArray = [];

                for (var i = 0; i < result.data.objects.length; i++) {
                    var item = result.data.objects[i];
                    var obj = {
                        guid: item.value,
                        name: item.attributes["Name"],
                        title: item.name,
                        moduleGuid: item.attributes["Module.Guid"],
                        moduleName: item.attributes["Module.Name"],
                        moduleTitle: item.attributes["Module.Title"],
                        databaseTable: item.attributes["Table.Name"]
                    };

                    if (item.attributes["SuperClassType.Name"] != "") {
                        obj.parentClassName = item.attributes["SuperClassType.Module.Name"] + "." + item.attributes["SuperClassType.Name"];
                    }

                    objectsArray.push(obj);
                }

                if (getType == "single") {
                    result.data = objectsArray[0];
                } else {
                    objectsArray.sort(function (a, b) {
                        var titleA = a.title.toLowerCase();
                        var titleB = b.title.toLowerCase();

                        if (titleA < titleB) {
                            return -1;
                        }

                        if (titleA > titleB) {
                            return 1;
                        }

                        return 0;
                    });
                    result.data = {objects: objectsArray};
                }

                onLoad(result);
            };

            self.query.runQuery({queryData: queryData, onLoad: getObjectsOnLoad, onError: onError});
        }
    };

    // User Commands: user.logOn, user.logOff
    this.user = {

        // logOn: log on using the credentials supplied in the constructor.  This does NOT need to be called if using loginOnDemand
        // parameters: onLoad, onError
        logOn: function (parameters) {
            var request = new webAccessConnector.webAccessRequest({
                connectionInfo: connectionInfo, onLoad: parameters.onLoad, onError: parameters.onError
            });
            request.logOn();
        },

        // logOff: log off.
        // parameters:  onLoad, onError
        logOff: function (parameters) {
            var request = new webAccessConnector.webAccessRequest({
                connectionInfo: connectionInfo, onLoad: parameters.onLoad, onError: parameters.onError
            });
            request.logOff();
        }

    };
};


// Static methods

// parseQueryUrl: turn a Url into structured query design data
webAccessConnector.parseQueryUrl = function (queryString) {
    var pairs = queryString.split("&");
    if (pairs.length == 0) {
        return;
    }

    var returnObject = {
        queryData: {}
    };

    // get the web access url if present
    var qMarkPos = pairs[0].indexOf("?");
    if (qMarkPos > -1) {
        if (queryString.substring(0, 4).toLowerCase() == "http") {
            // full url
            var parts = pairs[0].split("/");
            returnObject.webAccessUrl = parts.slice(0, 4).join("/");
        } else if (queryString.substring(0, 1) == "/") {
            // relative url
            returnObject.webAccessUrl = queryString.substring(0, queryString.indexOf("/", 1));
        }

        pairs[0] = pairs[0].substring(qMarkPos + 1);
    }

    // parse all parameters to an object
    var obj = {};
    for (var i in pairs) {
        var pair = pairs[i].split("=");
        var name = decodeURIComponent(pair[0]);
        var value = isNaN(pair[1]) ? decodeURIComponent(pair[1]) : parseFloat(pair[1]);
        obj[name] = value;
    }

    // extract the relevant parameters
    if (!obj.class_name) {
        return;
    }

    returnObject.queryData.class_name = obj.class_name;

    if ((obj.query) && (!obj.attributes)) {
        returnObject.queryData.query = obj.query;
    }

    if (obj.attributes) {
        returnObject.queryData.attributes = obj.attributes;
    }

    if (obj.page_size) {
        returnObject.queryData.page_size = obj.page_size;
    }

    if (obj.sort_by) {
        returnObject.queryData.sort_by = obj.sort_by;
    } // NOTE THIS WILL GET IGNORED BY WEB ACCESS!

    if (obj.cns) {
        returnObject.queryData.cns = obj.cns;
        var i = 0;
        while (true) {
            var cn = "c" + i;
            if (obj[cn]) {
                returnObject.queryData[cn] = obj[cn];
                i++;
            } else {
                break;
            }
        }
    }

    return returnObject;
}


// Internal use only from here...

// webAccessRequest

// Internal use only for Web Access calls with login on demand.
// Do not call directly use a webAccessConnector object instead.
// parameters: connectionInfo, commandPath, requestType, requestData, onLoad, onError, responseProcessor, requireJSON
webAccessConnector.webAccessRequest = function (parameters) {
    var self = this;
    var m_loginAttempted = false;
    var m_autoLogOff = false;
    var m_loggedOn = false;
    var m_loggedOff = false;
    var m_result = null;
    var m_resultIsSuccess = false;

    /**
     * Make the call
     */
    this.go = function () {
        var url = parameters.connectionInfo.webAccessUrl + parameters.commandPath;
        webAccessConnector.ajax.call(url, parameters.requestType, parameters.requestData, m_onLoad, m_onError, parameters.requireJSON);
    }

    /**
     * logOn (not required to be called manually if loginOnDemand is set in the constructor)
     * @param {boolean} onDemand
     */
    this.logOn = function (onDemand) {
        m_loginAttempted = true;
        m_loggedOn = true;

        var formData = {
            Ecom_User_ID: parameters.connectionInfo.loginUser,
            Ecom_User_Password: parameters.connectionInfo.loginPass
        };
        var onLoad = (onDemand) ? m_loginOnDemandOnLoad : m_onLoad;

        var loginUrl = parameters.connectionInfo.webAccessUrl + "/wd/Logon/Logon.rails";
        webAccessConnector.ajax.call(loginUrl, webAccessConnector.requestType.post, formData, onLoad, m_onError, true);
    }

    /**
     * log off
     * @param {boolean} onDemand
     */
    this.logOff = function (onDemand) {
        m_loggedOff = true;
        var logOffUrl = parameters.connectionInfo.webAccessUrl + "/wd/Logon/Logoff.rails";
        var onLoad = (onDemand) ? m_logOffDone : m_onLoad;
        var onError = (onDemand) ? m_logOffDone : m_onError;

        webAccessConnector.ajax.call(logOffUrl, webAccessConnector.requestType.post, null, onLoad, onError);
    }

    /**
     *
     * @param {Object} responseData
     * @param {Object} response
     */
    var m_onLoad = function (responseData, response) {
        if (parameters.responseProcessor) {
            parameters.responseProcessor(responseData, response);
        }

        m_result = {
            data: responseData, response: response, statusCode: response.status
        };
        m_resultIsSuccess = true;

        if (m_autoLogOff) {
            self.logOff({
                onDemand: true
            });
            return;
        }

        m_returnLoad();
    }

    var m_returnLoad = function () {
        m_result.loggedOn = m_loggedOn;
        m_result.loggedOff = m_loggedOff;
        if (parameters.onLoad) {
            parameters.onLoad(m_result);
        }
    }

    /**
     *
     * @param {number|string} statusCode
     * @param {string} errorText
     */
    var m_onError = function (statusCode, errorText) {
        if ((statusCode == 403) && (m_loginAttempted == false)) {
            if (parameters.connectionInfo.loginOnDemand) {
                self.logOn({
                    onDemand: true
                });
                return;
            } else {
                errorText = "Not Logged In";
            }
        }

        m_result = {
            statusCode: statusCode, errorText: errorText
        };

        if (m_autoLogOff) {
            self.logOff({
                onDemand: true
            });
            return;
        }

        m_returnError();
    }

    var m_returnError = function () {
        if (parameters.onError) {
            parameters.onError(m_result);
        }
    }

    /**
     *
     * @param {Object} responseData
     * @param {Object} response
     */
    var m_loginOnDemandOnLoad = function (responseData, response) {
        if (responseData.result == false) {
            m_onError(403, responseData.message);
            return;
        }

        // logged in, repeat the call
        if (parameters.connectionInfo.loginOnDemandAutoLogOff) {
            m_autoLogOff = true;
        }
        self.go();
    }

    var m_logOffDone = function () {
        if (m_resultIsSuccess == true) {
            m_returnLoad();
        } else {
            m_returnError();
        }
    }

}


// Constants

webAccessConnector.version = "1.0.1";
webAccessConnector.requestType = {
    get: "GET",
    post: "POST"
};

// Ajax Helpers

// Internal use only for actual server communication.
// Do not call directly.

webAccessConnector.ajax = {};

/**
 *
 * @param {string} url
 * @param {'GET'|'POST'} requestType
 * @param {Object} data
 * @param {function} onLoad
 * @param {function} onError
 * @param {?boolean} requireJSON
 */
webAccessConnector.ajax.call = function (url, requestType, data, onLoad, onError, requireJSON) {
    var parts = [];
    for (var i in data) {
        if (data.hasOwnProperty(i)) {
            parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(data[i]));
        }
    }
    data = parts.join("&");

    var req;
    if (window.XMLHttpRequest) {
        req = new XMLHttpRequest();
    } else {
        req = new ActiveXObject("Microsoft.XMLHTTP");
    }

    if (requestType == webAccessConnector.requestType.post) {
        req.open(requestType, url, true);
        req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    } else {
        url += "?" + data;
        req.open(requestType, url, true);
    }

    req.setRequestHeader("Accept", "application/json");
    req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    req.onload = function () {
        if (this.status != 200) {
            webAccessConnector.ajax.onAjaxError(this, this.statusText, onError);
            return;
        }

        // check integrated login
        var responseUrl = this.getResponseHeader("X-RequestUrl");
        if ((responseUrl) && (responseUrl.indexOf("Logon/IntegratedLogonFailed.rails") != -1)) {
            webAccessConnector.ajax.onAjaxError(this, "Integrated Logon Failed", onError);
            return;
        }

        // attempt JSON parse
        var data = null;
        try {
            data = JSON.parse(this.responseText);
        } catch (e) {
            if (requireJSON) {
                webAccessConnector.ajax.onAjaxError(this, "Invalid Response", onError);
                return;
            } else {
                data = this.responseText;
            }
        }
        var textStatus = this.statusText;
        webAccessConnector.ajax.onAjaxSuccess(data, textStatus, this, onLoad);

    };
    req.onerror = function () {
        webAccessConnector.ajax.onAjaxError(this, this.statusText, onError);
    };

    if (requestType == webAccessConnector.requestType.post) {
        req.send(data);
    } else {
        req.send();
    }

};

/**
 *
 * @param {?Object|?string} data
 * @param {string} textStatus
 * @param {Object} response
 * @param {?function} callback
 */
webAccessConnector.ajax.onAjaxSuccess = function (data, textStatus, response, callback) {
    // callback should be function (data, response)
    if (callback) {
        callback(data, response);
    }
};

/**
 *
 * @param {string} errorText
 * @param {Object} response
 * @param {?function} callback
 */
webAccessConnector.ajax.onAjaxError = function (response, errorText, callback) {
    // callback should be function (statusCode, errorText)
    if (!callback) {
        return;
    }
    if ((errorText == "") && (response.status == 0)) {
        errorText = "Connection Failed";
    } else {
        var data = null;
        try {
            data = JSON.parse(response.responseText);
            if (!data.message) {
                throw "";
            }
            errorText = data.message;
        } catch (e) {
            // chances are this is a Web Access error page, try manually extracting the error message text...
            var i = response.responseText.indexOf("exceptionMessage");
            if (i > -1) {
                var errorSlice = response.responseText.slice(i, response.responseText.indexOf("</div>", i));
                errorText = errorSlice.slice(errorSlice.lastIndexOf("<p>") + 3, errorSlice.lastIndexOf("</p>"));
            } else {
                errorText += " (" + response.status + ")";
            }
        }
    }
    callback(response.status, errorText);
};
