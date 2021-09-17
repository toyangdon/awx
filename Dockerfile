### This file is generated from
### tools/ansible/roles/dockerfile/templates/Dockerfile.j2
###
### DO NOT EDIT
###

# Build container
FROM quay.io/centos/centos:8 as builder

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

USER root

# Install build dependencies
RUN dnf -y module enable 'postgresql:12'
RUN dnf -y update && \
    dnf -y install epel-release 'dnf-command(config-manager)' && \
    dnf module -y enable 'postgresql:12' && \
    dnf config-manager --set-enabled powertools && \
    dnf -y install \
    gcc \
    gcc-c++ \
    git-core \
    glibc-langpack-en \
    libffi-devel \
    libtool-ltdl-devel \
    make \
    nodejs \
    nss \
    openldap-devel \
    patch \
    @postgresql:12 \
    postgresql-devel \
    python38-devel \
    python38-pip \
    python38-psycopg2 \
    python38-setuptools \
    swig \
    unzip \
    xmlsec1-devel \
    xmlsec1-openssl-devel

RUN python3.8 -m ensurepip && pip3 install "virtualenv < 20"

# Install & build requirements
ADD Makefile /tmp/Makefile
RUN mkdir /tmp/requirements
ADD requirements/requirements.txt \
    requirements/requirements_tower_uninstall.txt \
    requirements/requirements_git.txt \
    /tmp/requirements/

RUN cd /tmp && make requirements_awx

# Use the distro provided npm to bootstrap our required version of node
RUN npm install -g n && n 14.15.1 && dnf remove -y nodejs

# Copy source into builder, build sdist, install it into awx venv
COPY . /tmp/src/
WORKDIR /tmp/src/
RUN make sdist && \
    /var/lib/awx/venv/awx/bin/pip install dist/awx-$(cat VERSION).tar.gz

# Final container(s)
FROM quay.io/centos/centos:8

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

USER root

# Install runtime requirements
RUN dnf -y module enable 'postgresql:12'
RUN dnf -y update && \
    dnf -y install epel-release 'dnf-command(config-manager)' && \
    dnf module -y enable 'postgresql:12' && \
    dnf config-manager --set-enabled powertools && \
    dnf -y install acl \
    git-core \
    git-lfs \
    glibc-langpack-en \
    krb5-workstation \
    libcgroup-tools \
    nginx \
    @postgresql:12 \
    python3-devel \
    python3-libselinux \
    python38-pip \
    python38-psycopg2 \
    python38-setuptools \
    rsync \
    subversion \
    sudo \
    vim-minimal \
    which \
    unzip \
    xmlsec1-openssl && \
    dnf -y install centos-release-stream && dnf -y install "rsyslog >= 8.1911.0" && dnf -y remove centos-release-stream && \
    dnf -y clean all

RUN curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 && \
    chmod 700 get_helm.sh && \
    ./get_helm.sh

# Install tini
RUN curl -L -o /usr/bin/tini https://github.com/krallin/tini/releases/download/v0.19.0/tini-arm64 && \
    chmod +x /usr/bin/tini

RUN python3.8 -m ensurepip && pip3 install "virtualenv < 20" supervisor

RUN rm -rf /root/.cache && rm -rf /tmp/*



# Ensure we must use fully qualified image names
# This prevents podman prompt that hangs when trying to pull unqualified images
RUN mkdir -p /etc/containers/registries.conf.d/ && echo "unqualified-search-registries = []" >> /etc/containers/registries.conf.d/force-fully-qualified-images.conf && chmod 644 /etc/containers/registries.conf.d/force-fully-qualified-images.conf

# Copy app from builder
COPY --from=builder /var/lib/awx /var/lib/awx

RUN ln -s /var/lib/awx/venv/awx/bin/awx-manage /usr/bin/awx-manage


# Create default awx rsyslog config
ADD tools/ansible/roles/dockerfile/files/rsyslog.conf /var/lib/awx/rsyslog/rsyslog.conf
ADD tools/ansible/roles/dockerfile/files/wait-for-migrations /usr/local/bin/wait-for-migrations

## File mappings
ADD tools/ansible/roles/dockerfile/files/launch_awx.sh /usr/bin/launch_awx.sh
ADD tools/ansible/roles/dockerfile/files/launch_awx_task.sh /usr/bin/launch_awx_task.sh
ADD tools/ansible/roles/dockerfile/files/settings.py /etc/tower/settings.py
ADD _build/supervisor.conf /etc/supervisord.conf
ADD _build/supervisor_task.conf /etc/supervisord_task.conf
ADD tools/scripts/config-watcher /usr/bin/config-watcher

# Pre-create things we need to access
RUN for dir in \
      /var/lib/awx \
      /var/lib/awx/rsyslog \
      /var/lib/awx/rsyslog/conf.d \
      /var/lib/awx/.local/share/containers/storage \
      /var/run/awx-rsyslog \
      /var/log/tower \
      /var/log/nginx \
      /var/lib/postgresql \
      /var/run/supervisor \
      /var/run/awx-receptor \
      /var/lib/nginx ; \
    do mkdir -m 0775 -p $dir ; chmod g+rw $dir ; chgrp root $dir ; done && \
    for file in \
      /etc/subuid \
      /etc/subgid \
      /etc/group \
      /etc/passwd \
      /var/lib/awx/rsyslog/rsyslog.conf ; \
    do touch $file ; chmod g+rw $file ; chgrp root $file ; done


RUN ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

ENV HOME="/var/lib/awx"
ENV PATH="/usr/pgsql-10/bin:${PATH}"

USER 1000
EXPOSE 8052

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD /usr/bin/launch_awx.sh
VOLUME /var/lib/nginx
VOLUME /var/lib/awx/.local/share/containers/storage
