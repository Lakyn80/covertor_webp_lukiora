import multiprocessing

bind = "0.0.0.0:5000"

workers = max(2, multiprocessing.cpu_count() // 2)
threads = 2

timeout = 600
graceful_timeout = 60

max_requests = 200
max_requests_jitter = 50

preload_app = False

accesslog = "-"
errorlog = "-"
loglevel = "info"

keepalive = 5
worker_tmp_dir = "/dev/shm"
