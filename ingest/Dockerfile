FROM bluenviron/mediamtx:latest
COPY mediamtx.yml /mediamtx.yml

# Puertos: RTMP, SRT, HLS, API
EXPOSE 1935 8888 8890 9997

CMD ["/mediamtx", "/mediamtx.yml"]
