
// app desc: Job Refresh for RainForest
// author: Paul Sweeney Jr


var appState = { workTab: null };
var color = {
    BLACK: [0,0,0,255],
    GREEN: [0,255,0,255]
};


var app = {
    timeout: null,
    running: false,
    HOW_LONG: 20 * 1000, // 20 seconds refresh rate.

    toggleBadge: (on) => {
        if (!on) {
            chrome.browserAction.setBadgeBackgroundColor({color: color.BLACK});
            chrome.browserAction.setBadgeText({text: "OFF"});
        } else {
            chrome.browserAction.setBadgeBackgroundColor({color: color.GREEN}); 
            chrome.browserAction.setBadgeText({text: "ON"});
            // only to test sounds
           
        } 
    },

    setup: () => { 
        app.setupEvents(); 
        app.toggleBadge(false);
    },


    // setup Chrome Events

    setupEvents: () => {
        
        
        chrome.idle.setDetectionInterval(60);
        chrome.idle.onStateChanged.addListener(state => { 
            if (state !== "active") {
                if (app.running) {
                     app.allStop();  // idle or locked more than 1 minutes..  forget it  (Be fair to other workers)
                }
            }
        });

        // make your life easier w/ math step

        chrome.commands.onCommand.addListener( command => {
            console.log(command);
            if (command !== "add-this-string") return;
            console.log("it works here... Cmd or Ctrl + Shift + A");
            chrome.tabs.query( {currentWindow: true, active: true, highlighted: true} , t => {
                if (chrome.runtime.lastError) {} // in case if needed... can use it later
                var code = "document.querySelector('body').innerHTML";
                chrome.tabs.executeScript(t.id, {code: code}, result => {
                    var re = /Add \d{3} and \d{3} using a calculator\./; 
                    if (re.test(result[0])) {
                        var mathString = re.exec(result[0]); // get the math string from the html body
                        var digits = mathString[0].match(/\d{3}/g); // get 2 digits out of the math string
                        var answer = parseInt(digits[0]) + parseInt(digits[1]);
                        if (answer) {
                            var msg = `${digits[0]} + ${digits[1]} = ${answer}`;
                            alert(msg);
                        }

                    }

                });


            });


        });
        

        chrome.browserAction.onClicked.addListener( () => {
   

            app.running = !app.running;
            if(app.running){
                app.toggleBadge(true);
                app.run();
            } else {
                app.allStop();
            }
        });

    },

    // run the program

    run: () => {

        app.getTabInfoAndReload();

    },

    // stop the program

    allStop: () => {  
        app.running = false;  
        clearTimeout(app.timeout); 
        app.toggleBadge(false);
    },


    // check to see if current tab is an actual Rainforest job!

    getTabInfoAndReload: () => {
        chrome.tabs.query( {currentWindow: true, active: true, highlighted: true} , t => {
            if (chrome.runtime.lastError) {} // in case if needed... can use it later
        
            // regEx to check Rainforest Job URL
               var re = /tester\.rainforestqa\.com\/tester\//;
               

           
            if(re.test(t[0].url)) {
                // it's rainforest job! :)
                appState.workTab = t[0];

                app.checkAndReload(true); // loop until found

            } else {
                alert("This is NOT rainforest Job!, please only use rainforest job tab");
                app.allStop();
            }
        });
    },


    // main part of the program (run loop)

    checkAndReload: () => {
        // capture warning message on rainforest job page
        var code = "document.querySelector('body').innerHTML";

        chrome.tabs.executeScript(appState.workTab.id, {code: code}, (result) => {
                    if (chrome.runtime.lastError) {  
                        console.log("error happened.. " + chrome.runtime.lastError.message);
                        app.allStop();
                        return;
                    }

                    var re  = /no virtual machines currently available/i;
                    var re2 = /Another worker accepted the job before you/i;
                    var re3 = /Rate limit exceeded/i;

                    if (re.test(result[0]) || re3.test(result[0])) {
                        // "no virtual machine" message still on screen
                        
                        // let reload the job
                        chrome.tabs.reload(appState.workTab.id);

                    } else if (re2.test(result[0])) {
                        // another worker accepted the job :(
                        app.allStop();
                        alert("Sorry, another worker accepted the job before you!");
                        chrome.tabs.update(appState.workTab.id, {highlighted: true});

                    } else {
                        app.allStop();
                        alert("Virtual Machine might be BACK!");
                        chrome.tabs.update(appState.workTab.id, {highlighted: true});
                    }
            });

            // loop until virtual machine errors disappears.
            
            if (app.running) {
                 console.log("still running");
                 clearTimeout(app.timeout);
                 app.timeout = setTimeout(app.checkAndReload, app.HOW_LONG);
            }
           
    }
};



app.setup();  // launch point for Chrome Extension to load.

// saving this for rainforest job checker extension.....

 var soundData = "data:audio/mp3;base64,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pmx3BewHrLWEqoC5UNFzEQ34n72rTMxsjMdTebrgnTpVttaz//i1t2rbL2HCtvV26Cy+kGLRXRsW7arWXWHz3T3entvtTHUhaATxlKxNl9OKU5VlmYm+qtnUsSHAjbWdnK9Ok/mNGnM3utq18fxjQG9lkeQ4TM+e1is2cSvqtapgIc3Pn7g7xKxMU1zedwVD//OIxLo+bA6af894ASrL5Qn9Hb0NUNI240ka0OumJ9h9GexYu8Q31rwWF61NK6XRpH+S1Qth3BpDdQ4zU4bwsRzHuXluUMsRiZ0Je0LNZzbfSpBu2vUShJVE+jQFc2mbCWZ1g5kuso06oa0qnrxTtbC4vGLKzAE0STn7539r35xvtN2NxO1pSXEYfA6ILEEV3fbmZneyzLXL3OWn3EY9aOGoqNJ4DlhjctWetm5ZLR6XcnC088h3WR8tMEcX5q6CC7K16ApKuiWRSRBTMq6rd7RXZvLF7L9byzf5WtctFotNG43dnIMWibLsk0vONvaqennv/MsR3lovhI0ow8iDXjqqmi7dQlp0l09FOVUPTcM+MtmoeBgkKU50oTpefJ5i//NoxNMt6/JyXnsNHSJOJdMZRrViIMwKAVtiVPEj5KkaLQLkB5dLNFUphWapKwHwAiVZpb1LxrK8XM3fiqqQoNVZOkhNyJGLComkhjQtI4ea1yLHRpKsSeKHLB5qMLHNZTCwsUajHMNQWEa6PRxVLpSnRqg62fZNJRTFiTt0mo6J6vg1+mJUULXgWmu2V4vcrZlZyUc4o5xj1QwPB6HTANgV7h8HBwwG1qaNSHNFFABvf/9vZfrY3hmK0xVaXmXJDBaoIYGgkFwyycbDJVDToMFzSJEhTxtQ//NYxOYvRAZSVnpQ3SqETpQOyIQ1BDggXJXI0LZKyWNGnGhSIOEwQHF4Ul8SCpQJPVjTjkjULQuQ4VKQCRm2pNsmSbnL8RlSa8a6Bzacd3abqXfaS4UbFectHKryW/5s1uyza3fK+XH/bSta2n5T6854//2StvMzdf6vc75P+z7u5eWJZr2IN0483XKYt8ZjetiqBW+u+/9tkjjA5gxGkGJfBjR5APh/IRYH5s6itBkLNHZl//NoxNArjAY+XHpMfUKo7RUfap3xQrXnME96M6Bt9EgWynxclJFvSJMIE1JxuTlJM+EUbpGFupKC5fDjXNdsnkpI4S3Slvm1LE2z+ZQVhgvsaxqqFilChgxhtiAoarToCpzu4UZaJaiVYKssf1aXL8mY1pLmS/L6xmXpZcpZ0UZQVmRxxMrAhzZjBDxVKngMsAkJQFQGJDAYKhI8d/////4SPBo6elhN//WlCW8YlQFInXK0ESVMQU1FMy45OS41VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NIxOwoVAY6XmGHUVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MoxM0J+CIUtDDEAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";

// var sound = new Audio(soundData);
// sound.play();

