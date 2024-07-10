import unittest

from qai.core.message import Message
from qai.storage.history.history_maker import CompanyHistory


class TestAWSHistory(unittest.TestCase):
    def tearDown(self) -> None:
        return super().tearDown()

    def test_make_load_delete_history(self):
        h = CompanyHistory("TestCompany")
        user_id = "1"
        h.delete(user_id)
        ## History starts empty
        history = h.get_history(user_id, ignore_warnings=True)
        self.assertEqual(history, [])
        ## Add a message
        m = Message.from_values("user", "user message", "")
        h.add_history(user_id, m)
        history = h.get_history(user_id)
        self.assertEqual(history, [m])
        ## Save, then force history to load from s3
        h.save(user_id)
        h.history = {}  ## Force reload of user
        history = h.get_history(user_id)
        self.assertEqual(history, [m])
        ## Delete from s3 then verify history is empty
        h.delete(user_id)
        self.assertEqual(h.exists(user_id), False)


if __name__ == "__main__":
    unittest.main()
