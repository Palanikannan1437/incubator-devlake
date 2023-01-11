FROM gitpod/workspace-full:2022-12-15-12-38-23

# installing a specific go version
ENV GO_VERSION=1.19
ENV GOPATH=$HOME/go-packages
ENV GOROOT=$HOME/go
ENV PATH=$GOROOT/bin:$GOPATH/bin:$PATH

RUN curl -fsSL https://dl.google.com/go/go${GO_VERSION}.linux-amd64.tar.gz | tar xzs \
    && printf '%s\n' 'export GOPATH=/workspace/go' \
    'export PATH=$GOPATH/bin:$PATH' > $HOME/.bashrc.d/300-go

# installing a specific node version
RUN bash -c 'VERSION="14.21.0" \
     && source $HOME/.nvm/nvm.sh && nvm install $VERSION \
     && nvm use $VERSION && nvm alias default $VERSION'

RUN echo "nvm use default &>/dev/null" >> ~/.bashrc.d/51-nvm-fix

# installing additional languages
RUN sudo apt install cmake -y

RUN cd /workspace/incubator-devlake && sudo git clone --depth=1 -b v1.3.0 https://github.com/libgit2/libgit2.git \
    && sudo rm -rf ./libgit2/.git \
    && cd libgit2 \
    && sudo mkdir build \
    && cd build \
    && sudo cmake .. \
    && sudo make && sudo make install