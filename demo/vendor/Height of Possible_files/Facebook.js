define(['libjs/signals/Signal', 'jquery', 'framework/config/Settings', 'framework/config/Dev', 'Global'], function(Signal, $, Settings, Dev, Global) {

    var fb = {};
    fb.onAuthResponse = new Signal();
    fb.onLoggedIn = new Signal();
    fb.onLoginFailed = new Signal();

    // Serverside
    fb.onServersideLoggedIn = new Signal();
    fb.onServersideLoginFailed = new Signal();

    // USER DATA
    fb.user = {
        data: {},
        accessToken: null,
        localID: null
    };
    // end USER DATA

    fb.authResponse = null;

    var initialized = false;
    var initializedCB = null;

    // check the global USER variable
    if (window.USER){
        // Populate data
        fb.user.data.id = USER.fbid;
        fb.user.data.first_name = USER.first_name;
        fb.user.localID = USER.id;
        fb.user.accessToken = USER.access_token;
    }

    window.fbPopupLoginHandler = function(data) {
        fbPopupResponseData = data;
        console.log('fbPopupResponseData: ', fbPopupResponseData);
        // So we're not attached to the popup window
        setTimeout(function() {
            // console.log('data: ', data);
            if (data && data.ok) {
                // Set user data
                fb.user.data.id = data.fbid;
                fb.user.data.first_name = data.first_name;
                fb.user.localID = data.user_id;
                fb.user.accessToken = data.access_token;
                fb.onServersideLoggedIn.dispatch();
            } else {
                fb.onServersideLoginFailed.dispatch();
            }
        }, 0);
    };

    fb.loginServerside = function() {
        if (Settings.config.skipFBLogin || (ENV == 'development' && Dev.skipFBLogin)) {
            // Skip actual FB login
            fb.user.data = {
                id: Dev.fbID
            };
            fb.user.localID = '52fbdce9eb5e534699075c32';
            fb.onServersideLoggedIn.dispatch();
        } else {
            var strWindowFeatures = "menubar=no,location=no,resizable=yes,scrollbars=yes,status=yes,width=580,height=400";
            fb.loginWindowObjectReference = window.open("/auth/facebook", "FacebookLogin", strWindowFeatures);
        }
    };

    // POST PHOTO
    fb.postDataURI = function(dataURI, mimeType, message) {
        message = message || "";
        var blob = fb.dataURItoBlob(dataURI, mimeType);
        // Form data
        var fd = new FormData();
        //fd.append("access_token", Facebook.authResponse.accessToken);
        fd.append("source", blob);
        fd.append("message", message);
        //fd.append("filename", "FILE"); // Apparantly, this can't be blank
        fb.postFormData(fd);
    };

    fb.postFormData = function(formData, complete, error) {
        $.ajax({
            url: "https://graph.facebook.com/" + fb.user.data.id + "/photos?access_token=" + fb.user.accessToken,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            cache: false,
            success: function(data) {
                console.log("postFormData success " + data);
            },
            error: function(shr, status, data) {
                console.error("postFormData error " + data + " Status " + shr.status);
                if (error) {
                    error(data);
                }
            },
            complete: function() {
                console.log("postFormData complete");
                if (complete) {
                    complete();
                }
            }
        });
    };
    fb.dataURItoBlob = function(dataURI, mime) {
        // Strip mime declaration
        dataURI = dataURI.replace('data:' + mime + ';base64,', '');
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs
        var byteString = window.atob(dataURI);
        // separate out the mime component
        // write the bytes of the string to an ArrayBuffer
        //var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(byteString.length);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        // write the ArrayBuffer to a blob, and you're done
        var blob = new Blob([ia], {
            type: mime
        });
        return blob;
    };

    fb.profilePhotoURL = function(width, height){
        return fb.getPhotoURL(fb.user.data.id, width, height);
    };

    fb.getPhotoURL = function(id, width, height){
        if (!id){
            return null;
        }
        width = width || 150;
        height = height || 150;
        return "http://graph.facebook.com/"+id+"/picture?width="+width+"&height="+height;
    };

    window.fbAsyncInit = function() {

        FB.init({
            appId: Settings.config.fbAppID,
            status: false, // check login status
            // cookie: true, // enable cookies to allow the server to access the session
            // xfbml: true // parse XFBML
        });

        // Here we subscribe to the auth.authResponseChange JavaScript event. This event is fired
        // for any authentication related change, such as login, logout or session refresh. This means that
        // whenever someone who was previously logged out tries to log in again, the correct case below 
        // will be handled. 
        FB.Event.subscribe('auth.authResponseChange', function(response) {
            console.log('response: ', response);
            fb.onAuthResponse.dispatch(response);
        });

        initialized = true;

        // Call initialized CB
        if (initializedCB) {
            initializedCB();
            initializedCB = null;
        }

    };

    fb.onScriptInit = function(cb) {
        if (initialized) {
            cb();
        } else {
            initializedCB = cb;
        }
    };

    fb.login = function(cb) {
        FB.login(cb, {
            scope: 'publish_actions'
        });
    };

    // Load the SDK asynchronously
    (function(d) {
        var js, id = 'facebook-jssdk',
            ref = d.getElementsByTagName('script')[0];
        if (d.getElementById(id)) {
            return;
        }
        js = d.createElement('script');
        js.id = id;
        js.async = true;
        js.src = "//connect.facebook.net/en_US/all.js";
        ref.parentNode.insertBefore(js, ref);
    }(document));


    return fb;

});