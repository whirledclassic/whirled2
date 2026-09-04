# ARCHIVE — not written by whirledclassic

**Author: Shadowsych** (Synced Online community).

This file is a preservation copy of Shadowsych’s Whirled / msoy setup notes so they are not stuck on a Google Drive link.  
**We did not write this. We do not maintain Synced Online. We are not Shadowsych.**

Shadowsych’s own line: the document may be given to anyone; they called it open-source.

Read this as history + extra knobs (Apache, billing, postfix, recaptcha, cron).  
For *this* project’s lab, start with [VM-GUIDE.md](../VM-GUIDE.md) and [CLASSIC-LAB.md](../CLASSIC-LAB.md) instead. That path is a NAT Debian VM, Java 8, no home ports.

Warnings that still apply:

- The MediaFire “Msoy Dependencies.zip” is **not** hosted here. Do not upload leaked jars or player dumps to this repo.
- Ubuntu 14.04 + OpenJDK paths are dated. We use Java 8 on Debian 13 in a VM.
- `www-data ALL=NOPASSWD: ALL` is as dangerous as the original note says. Do not do that on a box you care about.
- Opening port 80 on a rented dedicated server is the opposite of our lab rule.

Original Discord handles in the text below are from the source doc (Shadowsych#7914, Cactus#7906). Those discriminator forms are old.

---

# Whirled (msoy) Documentation

Authors: Shadowsych

This document may be given to anyone without the permission of the authors of the document. In other words, it’s open-source :).

## Table of Contents

Introduction

Dedicated Server and Domain Hosting:

- Dedicated Server Hosting
- Domain Hosting

Building:

- Maven Dependencies (.m2)
- Msoy Files (msoy)
- Java Compiler, JDK, and Ant
- Editing The Msoy Server Properties
- Editing The Source Paths
- Configuring The CSS Styling
- PostgreSQL
- Build and Run The Server

Other Essentials:

- Apache Server
- Billing
- Cron Jobs
- SMTP Server (E-mailing)
- AVRG Server
- Captcha Code on Registration
- Restart The Server During a Crash
- Sudo Command Access for Apache Server (Risky)
- IP Banning
- Enabling the Linux Desktop GUI (for Dedicated Servers only)
- Fixing Distall

Troubleshooting:

- Oh Noez (We’re not in kansas anymore)

---

## Introduction

Welcome to the updated documentation for Whirled (or Synced Online, whatever you prefer to call it). The documentation was written by Shadowsych. The purpose of this documentation is to provide a setup guide for ambitious developers through the jungle that is Whirled. You could contact me via Discord at Shadowsych#7914. Good luck!

If I do not respond to your questions, then contact these people via Discord for help:

1. Cactus#7906

---

## Dedicated Server and Domain Hosting

### Dedicated Server Hosting

A dedicated server is a server that runs the game’s files under a third-party host. A dedicated server is extremely helpful because the developer does not have to host the game 24/7 under his or her own computer, instead they can pay for a server that will do that for them. Synced Online uses OVH server hosting, so I strongly recommend OVH for server hosting.

Note: This entire documentation is written through the perspective of a server hosted by OVH.

Note: The terms “Ubuntu server”, “Dedicated Server”, and “Ubuntu Dedicated Server” will be used interchangeably throughout this document.

Note: You have to repurchase the dedicated server hosting service monthly.

Note: If you don’t want to use a dedicated server, then you’ll need to host the files in your own Linux Virtual Machine (I recommend using VirtualBox for the virtual machine program).

1. Create a customer account on OVH: https://www.ovh.com/ca/en/support/new_nic.xml
2. Purchase a dedicated server: https://www.ovh.com/us/dedicated-servers/hosting/
3. Once purchased, OVH should sent an email to you, check the email and it should give you the Control Panel login details
4. Login to the OVH Control Panel using the login details from the email here: https://ca.ovh.com/auth/
5. Choose the operating system to be an “Ubuntu 14.04” linux server
6. Finish any other extra details that OVH wants you to do in the Control Panel
7. Now go back to your email, and you should see that OVH has sent you an email for logging into the SSH server (secure shell). The SSH login details allows us to access our server remotely and edit its files from within an SSH server
8. Install x2goclient (an SSH server): http://wiki.x2go.org/doku.php/download:start
9. Once installed, open the program and in the top left click “Session” then “New Session”
10. The Session Name may be anything you like, I named mine “Synced Online”
11. The Host is the host provided by OVH in the email regarding the SSH connection
12. The Login is “desktop”, the SSH port is “22” and the the Session Type is “XFCE” then press the OK button in the bottom
13. On the top right, you should see a rectangle box for the session we just created, click it!
14. It will ask for the password, the password is the password provided by OVH in the email regarding the SSH connection
15. Once you enter in the password, press the OK button and you should be logged into your dedicated server! It may require you to install the Ubuntu 14.04, so just follow its instructions and get Ubuntu installed. When installing Ubuntu, make sure you choose the Ubuntu user to be “desktop”.

### Domain Hosting

A domain is just another name for “website name”; for example, www.syncedonline.com is our website name, meaning it is also the domain. We need a domain in order to host our website for the public, so we must purchase a domain from a domain hosting service. Synced Online uses Site5 Domain Hosting, so I strongly recommend Site5 for domain hosting.

Note: This entire documentation is written through the perspective of a domain hosted by Site5.

Note: You have to repurchase the domain hosting service month, every 6 months, or yearly based on the plan you purchased.

Note: If you don’t want to purchase a domain, then you can always use your localhost connection. If you wish for multiple people to access your server, then you’ll need to portforward your ip address and use a port (it is recommended to use port 80).

1. Purchase a Site5 Web Host from https://www.site5.com/hosting/web/
2. Once purchased, Site5 should email you the Client Login details
3. Login to the Client Login from here https://customers.site5.com/clientarea.php using the login details from the email
4. Once logged in, click the “Website Tools” in the left then click “URL Redirects”
5. For the Type, it should be “Permanent 301”, the http://(www.)? should be the domain that you purchased from Site5 (don't worry about the input box to the right), the ReDirects to should be the ip address of your Dedicated Server that was given by OVH (check the OVH emails or OVH Control Panel to find it), for the www. Redirection check the “Redirect with or without www.” option, for the Wildcard redirect you must check it, now click the Add button
6. You should be finished setting up your domain hosting. It may take an hour or two for the domain to be live, so don’t be impatient!

---

## Building

Now that we have purchased our domain and dedicated server, it’s time to build our Synced Online (or Whirled) game. Login to the server from x2goclient and let’s begin!

To begin, download this .zip file in your Ubuntu dedicated server: http://www.mediafire.com/file/fbad9k1n8ong66r/Msoy+Dependencies.zip

*(Archivist note: that zip is not mirrored here.)*

### Msoy Files (msoy)

The Msoy files are the source codes for the Synced Online game. These are the files that you edit, compile, and publish to implement any updates to the game. You can consider the Msoy files as the “heart of Synced.”

Note: The Msoy Files are inside the “msoy” folder of the Msoy Dependencies.zip.

Note: If you have the Synced Files from a Synced backup file, then you can use that. Otherwise, we are going to use the “msoy” folder within the Msoy Dependencies.zip.

1. Open the Msoy Dependencies.zip folder, and you should see the msoy folder inside
2. Go to the `/home/desktop/Desktop` directory, then drag the msoy folder into the directory.
3. You have finished setting up the Msoy Files!

### Maven Dependencies (.m2)

The Maven Dependencies are the files required for Synced to operate. Without the Maven Dependencies, then Synced would not have the packages needed to run, which is why they’re called “dependencies” (because Synced depends on them)! You can consider the Maven Dependencies as the “brain of Synced.”

Note: The Maven Dependencies are inside the “.m2” folder of the Msoy Dependencies.zip.

1. Open the Msoy Dependencies.zip folder, and you should see the .m2 folder inside
2. Place that .m2 folder in the same directory as the msoy folder.
3. You have finished setting up the Maven Dependencies!

### Java Compiler, JDK, and Ant

The Java Compiler is necessary to compile java source code, the JDK is necessary to run java programs, and Ant is a necessary tool to build the Synced files.

1. Open the “Terminal” program on your Linux computer and type `sudo apt-get update` then `sudo apt-get upgrade` then type `sudo apt-get -f install`
2. Then type `sudo apt-get install openjdk-8-jdk`
3. Then type `sudo update-alternatives --config java` and select `1`
4. Then type `sudo apt-get install ant`
5. You have successfully installed the Java Compiler, JDK, and Ant!

### Editing The Msoy Server Properties

The Msoy Server properties are the connections to the many server hosts of the game (domain host, mailhost, etc.), but we must configure them in order to connect to the proper hosts.

1. Go to `/home/desktop/Desktop/msoy/etc/test` and open the `msoy-server.properties` file
2. On line 15, remove the `#`, and make `server_url` equal to your domain. The domain *must* start with `http://www.` and end in a slash.
   - Example: `server_url = http://www.websitename.com/`
3. On line 20, make `server_host` equal to `websitename.com` and change the `websitename` part to your domain name
   - Example: `server_host = websitename.com`
4. On line 79, make `server_root` equal to `/home/desktop/Desktop/msoy`
5. On 140, make `media_dir` equal to `/home/desktop/Desktop/msoy/pages/media`
6. Go to line 141 and replace the `localhost` in `media_url` with your domain and remove the `:8080`.
   - Example: `media_url = http://websitename/media/`
7. On line 142, replace the `localhost` in `static_media_url` with your domain and remove the `:8080`.
   - Example: `static_media_url = http://websitename/media/static/`
8. On line 178, make `toybox.resource_dir` equal to `/home/desktop/Desktop/msoy/pages/media`
9. On line 31, replace the `8080` with `80`
10. You are now finished setting up the msoy server properties!

### Editing The Source Paths

The source paths are the locations of certain flex files within the Synced Files, but we must configure them to our file paths in our Ubuntu dedicated server.

1. Go to `/home/desktop/Desktop/msoy/dist` and open the `msoy-config.xml`
2. Within the `msoy-config.xml` file, find all the lines that have `flex3/blah/blah/blah` (there should be 8), and before all the `flex3` text, add the `/home/desktop/Desktop/msoy/` path.
3. Repeat for all of the 8 directories.
4. Go to line 347 and line 349 and change the `localhost:8080` to `yourwebsite.com`
5. Now go to `/home/desktop/Desktop/msoy/dist` and open the `thane-config.xml`
6. Within the `thane-config.xml` file, find all the lines that have `flex3/blah/blah/blah` (there should be 2), and before the `flex3` text, add the `/home/desktop/Desktop/msoy/` path.
7. Repeat for all of the 2 directories.
8. Now go to `/home/desktop/Desktop/msoy/flex3/frameworks` and open the `flex-config.xml`
9. Go to line 320 and change `/libs/framework.swc` to `/home/desktop/Desktop/msoy/flex3/frameworks/libs/framework.swc`
10. Go to line 321 and line 323 and change the `localhost:8080` to `yourwebsite.com`
11. Now go to `/home/desktop/Desktop/msoy` and open the `build.xml` file
12. Go to line 599 and change `/home/pravat/Desktop/MsoyFiles/msoy/export/whirled/lib` to `/home/desktop/Desktop/msoy/export/whirled/lib`
13. You are now finished editing the source paths!

### Configuring The CSS Style

1. Open the `/home/desktop/Desktop/msoy/rsrc/themed/css/frame.css.tmpl` file
2. On line 21 change `background: url($logoUrl) no-repeat;` to `background: url(/images/header/header_logo.png) no-repeat;`
3. On line 46 change `background: url($navUrl) no-repeat;` to `background: url(/images/header/navi_button_bg.png) no-repeat;`
4. On line 64 change `background: url($navSelUrl) no-repeat;` to `background: url(/images/header/navi_button_selected_bg.png) no-repeat;`
5. You are now finished setting the CSS style sheets!

### PostgreSQL

PostgreSQL is the database that Synced Online uses. The database allows us to store player information, room, game, and other datas into a set of organized tables.

1. Open the terminal and type `sudo apt-get install postgresql postgresql-contrib`
2. Now type `sudo su postgres` then type `createdb msoy`
   - If you want to drop (delete) a database, type `dropdb [NAME]`
3. Now type `psql` then `\password postgres` and set a password (make sure to remember this password because it will be your database password)
4. Exit out of the current terminal and open a new terminal
5. In the new terminal, type `sudo apt-get install pgadmin3`
6. Now type `pgadmin3` — this opens a program called pgadmin3 this can be used as a GUI system to manage your database in the future.
7. Open the msoy-server.properties file in etc/test and in line 186, make the `db.default.username` equal to `postgres`
8. In line 187, make the `db.default.password` equal to the password made in step 4.
9. You are now finished setting up the PostgreSQL database!

### Build Commands

Now that we have successfully setup the source paths and msoy server properties, we need to compile the source code. In order to compile the source code, we need to use the ant build commands.

Note: If any error appears on the terminal during this process, then you should go back to the “Editing The Source Paths” and “PostgreSQL” section and check if everything is correct.

Note: If a PostgreSQL connection error occurs then it's most likely because you're using Ubuntu 16.04 or above, so install a previous version of PostgreSQL.

1. Open a new terminal, type `cd ~/Desktop/msoy` and press enter.
2. Now type `sudo ant compile` then type `sudo ant dist` to compile the java source files
3. Now type `sudo ant flashapps` to compile the flash client and applets
4. Now type `sudo ant gclients` to compile the GWT java client
5. Now type `sudo ant genasync` to compile the Async java code
6. Now type `sudo ant tests` to compile unit tests
7. Now type `sudo ant thane-client` to compile the ActionScript thane-client
8. Now type `sudo ant viewer` to compile the viewer for the SDK
9. Now type `sudo ./bin/msoyserver` and it should setup your SQL tables and run the server! If the terminal returns “command not found” then type `cd ~/Desktop/msoy/bin` then type `chmod -R 777 .` in your Terminal.
10. Now open a web browser and go to your website’s domain, and you should see your server up-and-running!

Note: If you wish to stop your server, just press Ctrl+C on your server terminal.

---

## Other Essentials

### Apache Server

The Apache Server is required for any PHP code to run on Synced Online, an example is the Billing PHP code. The Apache Server will be running on port 8080 instead of port 80.

1. Open a new terminal and type `sudo apt-get install apache2`
2. Now type `sudo nano /etc/apache2/ports.conf` and within the text editor change the `Listen 80` to `Listen 8080` then save and exit
3. Now type `sudo chown -R desktop /var/www/html` in the terminal
4. Now type `sudo apt-get install libapache2-mod-php5` in the terminal
5. Now type `sudo apt-get install php5-curl` in the terminal
6. Type `sudo /etc/init.d/apache2 restart` to start the Apache server
7. You have now finished setting up the Apache server!

### Billing

The Billing services are required if we wish to allow players to purchase items from our shop. The Billing requires the PayPal IPN system, which requires PHP code.

1. Read the setup process here: https://github.com/Shadowsych/synced-billing

### SMTP Server (E-mailing)

The email service is necessary for players who want to validate their emails, get newsletters on the recent updates on Synced, wish to change their password, etc.

Note: If you have made a mistake during this process, then type: `sudo apt-get install postfix`

1. Open a terminal and type `sudo apt-get install mailutils`
2. Wait till the configuration screen comes on. Select the “Internet Site” option and press enter.
3. Follow the instructions the mailutils set-up tells you
4. Once finished with step 3, open msoy-server.properties
5. Goto in lines 99, 100, and 101 and set your own e-mail addresses
6. Now open a new terminal and type `sudo ant dist`
7. Step 7 is redundant but necessary, type the `sudo dpkg-reconfigure postfix` command and the configuration screen will pop up once again, make sure to choose the “Internet Site” option again
8. Now run `/etc/init.d/postfix reload` in your Terminal
9. You have successfully setup the SMTP server!

### AVRG Server

The AVRG server is the server that runs the in-room launcher games.

Note: This document does not provide every step for setting-up an AVRG server.

Note: Therefore, If the AVRG server still doesn’t work, then attempt to debug the errors thrown by the msoy terminal whenever a player tries to launch an AVRG.

1. Open a new terminal and type `sudo apt-get install lib32stdc++6` and `sudo apt-get install lib32z1`
2. You are finished setting up the AVRG Server!

### Captcha Code on Registration

The recaptcha program provided by Google allows for our website to stay protected from account registration spamming.

1. Login to your Google account and go to https://www.google.com/recaptcha/intro/index.html and click on “Get reCaptcha”
2. On the “Register a new site” type in your website’s name for the label
3. Type your domain into the Domain section, add any subsequent domains if you wish
4. Copy the public and private keys, named “Site key” and “Secret key” respectively
5. Open the `msoy/etc/test/msoy-server.properties` file
6. Goto Line: 230, remove the `#`, and paste the “Site Key” after the equal sign.
7. Goto Line: 231, remove the `#`, and paste the “Secret Key” after the equal sign.
8. Now open a terminal and type `sudo ant dist` and `sudo ant gclients`
9. You are finished setting up the Captcha Code!

### Restart The Server During a Crash

The server might die due to tabs crashing, ram overloading, bandwidth overloading, etc. Therefore, it is required to do a force restart on the server in order for it to re-function.

1. Open a new terminal and type `sudo fuser -k -n tcp 80` to shutdown the server on port 80
2. Type `sudo ./bin/msoyserver` to startup your server
3. Now the server should be up-and-running!

### Sudo Command Access for Apache Server (Risky)

You may want to use certain Apache server-side scripts that require the “sudo” root access, so you need to make sure to give the Apache LAMP Server certain permissions to do so.

Note: This is an extremely risky process and may destroy your sudo root access.

1. Use `sudo visudo` and add these codes to the bottom of the file

```
www-data ALL=NOPASSWD: ALL
%daemon ALL=NOPASSWD: ALL
```

2. Now save the file with Ctrl + X, and you are finished.

### IP Banning

IP Banning is required if you wish to ban a computer from entering your server.

1. Read how to set-up IP Banning here: https://github.com/Shadowsych/synced-ipcontrol

Note: You must complete the “Sudo Command Access for Apache Server” before doing this

### Fixing Distall

Distall is essential for rebuilding the server without it you have to run each build command by hand. To fix Distall, just do the following:

1. Open Build.xml for editing with your favorite editor
2. Navigate to line 998 and change the `depends="prepare,mavendeps,mavendeps-as,distbits,tests,gclients"/>` to `depends="prepare,disbits,tests,gclients"/>`
3. There, you’re done you can run `ant distall` to verifiy that it’s working.

### Enabling the Linux Desktop GUI (for Dedicated Servers only)

1. Connect to your server using SSH or VNC making sure to login to the root account.
2. Run `useradd desktop` and follow any prompts.
3. Run `passwd desktop` making sure to insert a secure password
4. (Optional) run `sudo apt-get update` in a new terminal.
5. Run the command `sudo apt-get install ubuntu-desktop` making sure to correctly follow any prompts given etc.
6. Run `sudo apt-get install gdm` or if that doesn’t work `sudo apt-get install ubuntu-gnome-desktop`
7. Run `sudo /etc/init.d/gdm start` if this doesn’t work, then skip it
8. Run `sudo dpkg-reconfigure xserver-xorg`
9. Now you should be able to connect via VNC Viewer and login to the account.

### Cron Jobs

Cron jobs are automated tasks that run every certain specified amount of time on your server. Cron jobs are essential to check for expired subscriptions or restart the server whenever the server is down at specific time periods. Below I detail how to make a cron job.

1. In a new Terminal, type `crontab -e` and then type `2` to open the cron job file in the nano text editor
2. Go to the very bottom of the cron job file, and type `*/10 * * * * [COMMAND]` for any new commands or files you want to run every 10 minutes
3. If you want to run a PHP file, make sure to run it as an executable through `*/10 * * * * /usr/bin/php [PHP FILE]` to run every 10 minutes
4. Once you’re finished, Ctrl + X and save the file

Note: Cron jobs are made with this format: `[CRON TIME] [COMMAND]`

Note: Each new cron job is done in a separate line in the cron job file

Note: Use this website to help you make specific cron times: https://crontab.guru/

---

## Troubleshooting

### Oh Noez (We’re not in kansas anymore)

Typically this page will pop up when the server cannot find the “Pages” Directory.

You should verify that your `server_root` directory in `msoy-server.properties` is correct.
