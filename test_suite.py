"""
AirbandScribe — Comprehensive Automated Test Suite
Discovers and executes all unit, integration, and QA test cases across tests/.
"""

import os
import sys
import unittest


def run_all_tests():
    project_root = os.path.dirname(os.path.abspath(__file__))
    tests_dir = os.path.join(project_root, "tests")
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    loader = unittest.TestLoader()
    suite = loader.discover(tests_dir, pattern="test_*.py")

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(run_all_tests())
