define(['Class'],function(Class){
    var URLParamUtils = new Class({

    });
    URLParamUtils.urlParam = function(name) {
        var results = new RegExp('[\\?&]' + name + '=([^&#/]*)').exec(window.location.href);
        if (results==null){
           return undefined;
        } else if(results[1] == "true"){
            return true;
        } else if(results[1] == "false"){
            return false;
        } else if(!isNaN(results[1])){
            return parseInt(results[1]);
        } else {
           return results[1] || false;
        }
    };

    URLParamUtils.checkSupportedParams = function(values, params) {
        for (var i = params.length - 1; i >= 0; i--) {
            values[params[i]] = URLParamUtils.urlParam(params[i]) || values[params[i]];
        };
    };
    return URLParamUtils;
});