#!/bin/bash

# Création du fichier de configuration logrotate
cat << EOF | sudo tee /etc/logrotate.d/blockchain-listener
/var/log/blockchain-listener/*.log {
    daily
    rotate 7
    compress
    delaycompress
    dateext
    missingok
    notifempty
    copytruncate
    create 644 nodejs nodejs
    postrotate
        systemctl kill -s USR1 blockchain-listener.service
    endscript
}
EOF

# Attribution des permissions
sudo chown root:root /etc/logrotate.d/blockchain-listener
sudo chmod 644 /etc/logrotate.d/blockchain-listener

# Test de la configuration
sudo logrotate -d /etc/logrotate.d/blockchain-listener

# Création du service systemd
cat << EOF | sudo tee /etc/systemd/system/blockchain-listener.service
[Unit]
Description=Blockchain Listener Service
After=network.target

[Service]
User=nodejs
WorkingDirectory=/path/to/your/app
ExecStart=/usr/bin/node dist/index.js
Restart=always
StandardOutput=append:/var/log/blockchain-listener/app.log
StandardError=append:/var/log/blockchain-listener/error.log

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd et démarrage du service
sudo systemctl daemon-reload
sudo systemctl enable blockchain-listener
sudo systemctl start blockchain-listener
