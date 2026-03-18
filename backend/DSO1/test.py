import os
import sys

# Append current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import agent

try:
    print("Running agent...")
    res = agent.run("Should I irrigate wheat at 36.8, 10.18?")
    print("Result:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
