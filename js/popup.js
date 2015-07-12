// FUNCTIONS

error = 'Service test failed.<br ><a href="https://www.getflix.com.au/login">Click here</a> to log in.<br >If you are logged in, <a href="https://www.getflix.com.au/setup/overview" target="_blank">click here</a> for setup information or check your internet connection.';

// Use the API to get an active user profile if one exists (ie, if someone is logged on)
function getUserProfile() {
    var profile;
    $.ajax({
        type: 'GET',
        url: 'https://www.getflix.com.au/api/v1/profile.json',
        async: false,
        success: function(data) {
            profile = data;
        }
    });
    return profile;
}

// Use json given as the regions parameter to create the region-switching UI
function generateTabs(regions) {
    // Fetch the JSON regions list
    var services = '';
    $.ajax({
        type: 'GET',
        url: 'https://www.getflix.com.au/api/v1/regions/list.json',
        username: apiKey,
        password: 'x',
        async: false,
        success: function(data) {
            services = data;
        }
    });

    var netflixSubs = services['netflix-subs'];
    netflixSubs.code = 'netflix-subs';

    // we're gonna set this up later, inside the netflix tab
    delete services['netflix-subs'];

    // sort services by order:
    // load them into an array
    var servicesArr = [];
    for (var code in services) {
        services[code].code = code;
        servicesArr.push(services[code]);
    }
    services = servicesArr;
    // and then actually sort
    services.sort(function(a, b) {
        return a.order - b.order;
    });

    // generate the html
    var tabs = '<div class="services-container"><h1>Netflix</h1><select class="services" name="services">';
    // for every service, add a dropdown option
    for (var i = 0; i < services.length; i++) {
        var service = services[i];
        tabs += '<option value="' + service.code + '">' + service.name + '</option>';
    }
    tabs += '</select></div><div class="content-wrapper">';

    var columns = 3;
    // for every region in every service, add a list option w/ flag
    for (var i = 0; i < services.length; i++) {
        var service = services[i];
        var regions = service.regions;

        delete regions[''];

        tabs += '<table id="' + service.code + '" class="region-list f16" role="option"><tbody>';

        var count = 0;
        for (var code in regions) {
            var region = regions[code];

            // get the country name from the hard-coded list in countries.js
            // otherwise we'd need to get them from Wikipedia or something
            region.country = countries[code];
            // if (region.country === undefined) {
            //     region.country = 'Turn Off';
            // }

            if (count % columns === 0) {
                tabs += '<tr>';
            }

            tabs += '<td id="' + code + '"><div class="flag ' + code + '"></div>' + region.country + '</td>';
            
            if (count % columns === columns-1) {
                tabs += '</tr>'
            }
            count++;
        }
        // add the subtitle switch
        if (service.code === 'netflix') {
            if (count % columns === 0) {
                tabs += '<tr>'; // add a row, ours is full
            }
            tabs += '<td id="subs"><div class="blocker"></div><input type="checkbox" class="flag" value="1" checked ><div class="label">Subtitles</div></td>';
            tabs += '</tr>';
        } else if (count % columns !== 0) {
            tabs += '</tr>';
        }
        tabs += '</tbody></table>';
    }
    tabs += '</div>';

    $('body').append(tabs);

    // So, for some reason, it seems like the first time
    // one of these handlers gets added, it gets triggered.
    // But only the FIRST time, so we're doing it first here
    // where it can't be seen. This avoids a janky transition
    // when a user actually clicks one of the buttons.
    $('.junk').on('webkitAnimationIteration', function() {
        $(this).removeClass('spinner');
    });

    // set up the subtitle switch
    var subsRegion = getRegion('netflix-subs');
    var subs = false;
    if (subsRegion.toUpperCase() === 'US') { // just in CASE
        subs = true;
    }
    $('#subs input').attr('checked', subs);
    $('#subs input').change(function() {
        var region = 'XX';
        if (this.checked) {
            region = 'US';
        }
        var service = 'netflix-subs';
        // don't check what it is, just assume it's changing
        $(this).addClass('spinner');
        setRegion(service, region);
    });

    // set the width of the body
    $('body').width((10 * columns) + 'rem');

    // set handler for service change
    $('.services').change(function() {
        var code = this.value
        var name = '';
        for (var i = 0; i < services.length; i++) {
            if (services[i].code === code) {
                name = services[i].name;
            }
        }
        $('h1').html(name);
        switchTab(code);
    });

    // set handler for region selection
    $('.region-list td:not(#subs)').click(function() {
        var region = $(this).attr('id').toUpperCase();
        var service = $(this).parent().parent().parent().attr('id');
        var currRegion = getRegion(service);

        if (currRegion !== region) {
            $(this).addClass('switcher');
            $(this).children('.flag').addClass('spinner');
            setRegion(service, region);
        }

    });
    $('#subs').click(function() {
        $('#subs input').click();
    })

    // start by switching to the first tab
    switchTab(services[0].code);
}

function switchTab(newTab) {
    // make the right region list visible
    $('.region-list').each(function() {
        if ($(this).attr('id') === newTab) {
            $(this).addClass('active-list');
        } else {
            $(this).removeClass('active-list');
        }
    });

    // set the current region to be selected
    var currRegion = getRegion(newTab);
    boldRegion(newTab, currRegion);

    // set the popup's height
    $('body').height($('.content-wrapper').height());
    $('html').height($('.content-wrapper').height());
}

// Find the current region of a particular service
function getRegion(service) {
    var region = '';
    $.ajax({
        type: 'GET',
        url: 'https://www.getflix.com.au/api/v1/regions.json',
        username: apiKey,
        password: 'x',
        async: false,
        success: function(data) {
            for (var i = 0; i < data.length; i++) {
                var currService = data[i].service;
                var currRegion = data[i].region;

                if (currService == service) {
                    region = currRegion;
                }
            }
        }
    });
    return region;
}

// Set the region of a particular service
// Returns whether it worked
function setRegion(service, region) {
    region = region.toUpperCase();
    var currRegion = getRegion(service, apiKey);
    if (region !== currRegion) {
        $.ajax({
            type: 'POST',
            url: 'https://www.getflix.com.au/api/v1/regions.json',
            processData: true,
            contentType: 'application/json',
            username: apiKey,
            password: 'x',
            data: JSON.stringify({
                "service": service,
                "region": region
            }),
            success: function(data) {
                if (service === 'netflix-subs') {
                    $('#subs input').on('webkitAnimationIteration', function() {
                        $(this).removeClass('spinner');
                        $(this).off('webkitAnimationIteration');
                    });
                } else {
                    $('#' + service + '.region-list tr #' + region).removeClass('switcher');
                    $('#' + service + '.region-list tr #' + region).children('.flag').on('webkitAnimationIteration', function() {
                        $(this).removeClass('spinner');
                        $(this).off('webkitAnimationIteration');
                    });
                    boldRegion(service, region);
                }

                // Refresh Netflix if it's the current tab
                chrome.tabs.query({
                    active: true,
                    currentWindow: true
                }, function(arrayOfTabs) {
                    if (arrayOfTabs[0].url.indexOf('netflix.com') > -1) {
                        var code = 'window.location.reload();';
                        chrome.tabs.executeScript(arrayOfTabs[0].id, {
                            code: code
                        });
                    }
                });
            }
        });
    }
}

function boldRegion(service, region) {
    $('#' + service + '.region-list td').each(function() {
        if ($(this).attr('id').toUpperCase() === region) {
            $(this).addClass('active-region');
        } else {
            $(this).removeClass('active-region');
        }
    });
}


// 1. check dns
// 2. create tabs
// 3. hide other tabs content

// MAIN

var profile = getUserProfile();
if (typeof profile === 'undefined') {
    $('.dns').html(error);

}
var apiKey = profile.api_key;

// Check DNS. If true, load tabs from the JSON.
$.getJSON('https://check.getflix.com.au/?format=json', function(data) {
    if (data.dns) { // dns returned true
        // report success
        $('.dns').html('Service test passed!');
        // wait a bit, and then generate the tabs
        setTimeout(function() {
            $('.dns').remove();

            generateTabs();

        }, 250);
    } else { // dns returned false
        // report failure, link to help
        $('.dns').html(error);
    }
});
