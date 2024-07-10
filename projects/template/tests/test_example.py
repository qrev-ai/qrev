import unittest


class TestClass(unittest.TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def tearDown(self) -> None:
        return super().tearDown()


if __name__ == "__main__":
    testmethod = ""
    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestClass(testmethod))
        runner = unittest.TextTestRunner()
        runner.run(suite)
    else:
        unittest.main()
