from django.db import models

class Reference(models.Model):
    original_data = models.TextField()
    formatted_data = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reference {self.id}"