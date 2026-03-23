# Generated migration – adds store_name and logo to StoreSettings

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0017_show_zero_price_products'),
    ]

    operations = [
        migrations.AddField(
            model_name='storesettings',
            name='store_name',
            field=models.CharField(
                default='Game Shop',
                help_text='Nome exibido no header, footer, checkout e nas páginas da loja.',
                max_length=100,
                verbose_name='nome da loja',
            ),
        ),
        migrations.AddField(
            model_name='storesettings',
            name='logo',
            field=models.ImageField(
                blank=True,
                null=True,
                help_text='Imagem de logo exibida no header, footer e checkout.',
                upload_to='store/logo/',
                verbose_name='logo da loja',
            ),
        ),
    ]
