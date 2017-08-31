FROM microsoft/windowsservercore
MAINTAINER roger@starcounter.com
LABEL Description="Starcounter" Vendor="Starcounter" Version="10"

ADD ./Install "C:/Install"
RUN /install/VC_redist.x64 /install /passive /norestart

ADD ./Data "C:/Data"

ADD ./Bin "C:/Bin"
ENV StarcounterBin "C:/Bin"
WORKDIR "C:/Bin"
#RUN powershell -Command Add-WindowsFeature Web-Server
CMD [ "scservice.exe","personal" ]
EXPOSE 8080 8181 9191