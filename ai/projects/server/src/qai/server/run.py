from qai.server import create_app
from qai.server.config import cfg

app = create_app(cfg)


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
