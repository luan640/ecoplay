from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_quoterequest_admin_notes'),
    ]

    operations = [
        migrations.AddField(
            model_name='sale',
            name='mp_payment_id',
            field=models.CharField(blank=True, default='', max_length=100, verbose_name='ID do pagamento MP'),
        ),
        migrations.AddField(
            model_name='sale',
            name='mp_status',
            field=models.CharField(blank=True, default='', max_length=50, verbose_name='status MP'),
        ),
    ]
