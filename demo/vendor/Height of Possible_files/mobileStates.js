define([], function(){


	var routes = [

        //We no longer need a preloader for Home since it's now done
        //in the mobileFramework...
        {
            name: 'home',
            url: '/',
            template: 'Home',
            controller: 'Home',
            // data: {
            //     next: 'homePreloaded',
            // }
        },
        // {
        //     name: 'homePreloaded',
        //     template: 'Home',
        //     controller: 'Home'
        // },
        {
            name: 'deviceNotSupported',
            template: 'DeviceNotSupported',
            controller: 'EmptyController'
        },

        {
            name: 'browserNotSupported',
            template: 'BrowserNotSupported',
            controller: 'EmptyController'
        },

        {
            name: 'menu',
            template: 'Menu',
            controller: 'MobileMenu'
        },
        
        {
            name: 'about',
            template: 'About',
            controller: 'AboutMenu'
        },
        
        {
            name: 'keepContributing',
            template: 'KeepContributing',
            controller: 'KeepContributingScreen'
        },

        {
            name: 'connectToDesktop',
            template: 'ConnectToDesktop',
            controller: 'ConnectToDesktopScreen'
        },
        
        /* //Not actually a state; just something we overlay in mobileFramework
        {
            name: 'lostConnection',
            template: 'LostConnection',
            controller: 'LostConnectionScreen'
        },*/

		{
            name: 'contribute',
            url: '/contribute',
            updateURL: false,
            template: 'Contribute',
            controller: 'Contribute'
        },

        {
            name: 'flickScreen',
            updateURL: true,
            url: '/flickScreen',
            template: 'Preloader',
            controller: 'Preloader',
            data: {
                next: 'flickScreenPreloaded'
            }
        },
        {
            name: 'flickScreenPreloaded',
            updateURL: false,
            url: '/flickScreenPreloaded',
            template: 'FlickScreen',
            controller: 'FlickScreen'
        }

	];

	return routes;

});